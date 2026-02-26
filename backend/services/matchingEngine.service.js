// services/matchingEngine.service.js
//
// The Matching Engine processes incoming orders against the order book.
// It implements price-time priority (CLOB) matching.
//
// Flow for a new LIMIT BUY order:
//   1. Lock taker's wallet (reserve priceCents × quantity)
//   2. Add taker to in-memory order book
//   3. Match loop: while best ask ≤ taker's bid price AND taker has remaining qty
//      a. Execute fill at maker's price
//      b. Persist Trade, update Orders, update Positions, update Wallets
//      c. Update in-memory book
//   4. If taker is fully filled → done
//   5. If taker partially filled → remains in book as open order
//
// All DB writes per fill are wrapped in a Mongoose session transaction.

const mongoose = require("mongoose");
const db = require("../models");
const orderBookService = require("./orderBook.service");
const { ORDER_SIDES, ORDER_TYPES, ORDER_STATUSES, OUTCOMES, PAYOUT_PER_SHARE } = require("../config/constants");
const { InsufficientFundsError, MarketClosedError, ValidationError } = require("../utils/error.utils");
const { matchingEngineLatency, ordersTotal, tradesTotal, tradingVolumeCents, orderBookDepth } = require("../utils/metrics");
const logger = require("../utils/logger");

class MatchingEngine {
  /**
   * Primary entry point: place a new order.
   *
   * @param {Object} params
   * @param {string} params.userId
   * @param {string} params.marketId
   * @param {"YES"|"NO"} params.outcome
   * @param {"BUY"|"SELL"} params.side
   * @param {"LIMIT"|"MARKET"} params.type
   * @param {number} params.priceCents  - Required for LIMIT orders
   * @param {number} params.quantity
   * @param {Object} [params.io]        - Socket.IO instance for broadcasting
   * @returns {Object} { order, fills, message }
   */
  async placeOrder({ userId, marketId, outcome, side, type, priceCents, quantity, io }) {
    const endTimer = matchingEngineLatency.startTimer();

    // ── 1. Validate market ──────────────────────────────────────────────────
    const market = await db.market.findById(marketId);
    if (!market) throw new ValidationError("Market not found");
    if (!market.isOpen) throw new MarketClosedError(`Market is ${market.status}`);

    // ── 2. Validate & prepare order ─────────────────────────────────────────
    if (type === ORDER_TYPES.MARKET && side === ORDER_SIDES.BUY) {
      // For market buy orders, use worst-case price (99¢) for reservation
      priceCents = 99;
    }
    if (type === ORDER_TYPES.MARKET && side === ORDER_SIDES.SELL) {
      priceCents = 1;
    }

    // For BUY orders: we reserve priceCents * quantity from wallet
    // For SELL orders: we need to verify position has enough shares
    const reservedCents = side === ORDER_SIDES.BUY ? priceCents * quantity : 0;

    // ── 3. Validate wallet / position ───────────────────────────────────────
    const wallet = await db.wallet.findOne({ userId });
    if (!wallet) throw new ValidationError("Wallet not found");

    if (side === ORDER_SIDES.BUY && wallet.availableBalanceCents < reservedCents) {
      throw new InsufficientFundsError(
        `Need ${reservedCents}¢ but only ${wallet.availableBalanceCents}¢ available`
      );
    }

    if (side === ORDER_SIDES.SELL) {
      const position = await db.position.findOne({ userId, marketId, outcome });
      const owned = position?.quantity || 0;
      if (owned < quantity) {
        throw new InsufficientFundsError(
          `Cannot sell ${quantity} shares, you only own ${owned}`
        );
      }
    }

    // ── 4. Create Order document ─────────────────────────────────────────────
    const orderDoc = await db.order.create({
      userId,
      marketId,
      outcome,
      side,
      type,
      priceCents,
      quantity,
      remainingQuantity: quantity,
      reservedCents,
      status: ORDER_STATUSES.OPEN,
    });

    // ── 5. Reserve funds (BUY) / lock position check done above ─────────────
    if (side === ORDER_SIDES.BUY && reservedCents > 0) {
      await wallet.reserveFunds(reservedCents, orderDoc._id.toString());
    }

    // ── 6. Add to in-memory order book ──────────────────────────────────────
    const book = orderBookService.getBook(marketId, outcome);
    book.addOrder({
      orderId: orderDoc._id,
      userId,
      priceCents,
      quantity,
      remainingQuantity: quantity,
      side,
      createdAt: orderDoc.createdAt,
    });

    ordersTotal.inc({ type, side, outcome, status: "placed" });
    logger.info(`📬 Order placed: ${side} ${outcome} ${quantity}@${priceCents}¢ by ${userId}`);

    // ── 7. Try to match ──────────────────────────────────────────────────────
    const fills = await this._runMatchingLoop({ takerOrderDoc: orderDoc, book, market, io });

    endTimer();

    // ── 8. Update order book depth metrics ──────────────────────────────────
    orderBookDepth.set({ market_id: marketId.toString(), outcome, side: "BUY" }, book.bids.size);
    orderBookDepth.set({ market_id: marketId.toString(), outcome, side: "SELL" }, book.asks.size);

    // ── 9. Broadcast updated order book snapshot ─────────────────────────────
    if (io) {
      this._broadcastSnapshot(io, marketId, outcome, book);
    }

    // Reload order to get latest state
    const updatedOrder = await db.order.findById(orderDoc._id);
    return { order: updatedOrder, fills };
  }

  /**
   * Core matching loop. Runs until taker is filled or no more matches possible.
   */
  async _runMatchingLoop({ takerOrderDoc, book, market, io }) {
    const fills = [];
    let takerRemaining = takerOrderDoc.remainingQuantity;

    while (takerRemaining > 0) {
      // Get the best counter-party order
      const makerEntry =
        takerOrderDoc.side === ORDER_SIDES.BUY
          ? book.asks.getBestOrder() // BUY taker matches with lowest SELL ask
          : book.bids.getBestOrder(); // SELL taker matches with highest BUY bid

      if (!makerEntry) break; // No orders to match

      // Check price compatibility
      const priceMatches =
        takerOrderDoc.side === ORDER_SIDES.BUY
          ? takerOrderDoc.priceCents >= makerEntry.priceCents // BUY price ≥ ASK price
          : takerOrderDoc.priceCents <= makerEntry.priceCents; // SELL price ≤ BID price

      if (!priceMatches) break;

      // Determine fill quantity
      const fillQty = Math.min(takerRemaining, makerEntry.remainingQuantity);
      const fillPrice = makerEntry.priceCents; // Maker's price (price-time priority)

      // Execute the fill in a DB transaction
      const fill = await this._executeFill({
        takerOrderDoc,
        makerOrderId: makerEntry.orderId,
        makerUserId: makerEntry.userId,
        fillQty,
        fillPrice,
        market,
      });

      fills.push(fill);

      // Update in-memory book
      const newMakerRemaining = makerEntry.remainingQuantity - fillQty;
      if (newMakerRemaining <= 0) {
        const makerSide =
          takerOrderDoc.side === ORDER_SIDES.BUY ? ORDER_SIDES.SELL : ORDER_SIDES.BUY;
        book.removeOrder(makerEntry.orderId, makerSide);
      } else {
        book.updateOrderQuantity(makerEntry.orderId, makerEntry.side, newMakerRemaining);
      }

      takerRemaining -= fillQty;

      // Update taker in book
      if (takerRemaining <= 0) {
        book.removeOrder(takerOrderDoc._id.toString(), takerOrderDoc.side);
      } else {
        book.updateOrderQuantity(
          takerOrderDoc._id.toString(),
          takerOrderDoc.side,
          takerRemaining
        );
      }

      // Update book's last trade price
      book.lastTradePriceCents = fillPrice;

      // Broadcast individual trade event
      if (io) {
        this._broadcastTrade(io, market._id, takerOrderDoc.outcome, fill);
      }

      logger.info(
        `⚡ Fill: ${fillQty} × ${takerOrderDoc.outcome}@${fillPrice}¢ | ` +
        `taker:${takerOrderDoc.userId} maker:${makerEntry.userId}`
      );
    }

    // Update taker order's final state
    await db.order.findByIdAndUpdate(takerOrderDoc._id, {
      filledQuantity: takerOrderDoc.quantity - takerRemaining,
      remainingQuantity: takerRemaining,
      status:
        takerRemaining === 0
          ? ORDER_STATUSES.FILLED
          : takerRemaining < takerOrderDoc.quantity
          ? ORDER_STATUSES.PARTIALLY_FILLED
          : ORDER_STATUSES.OPEN,
      ...(takerRemaining === 0 && { closedAt: new Date() }),
    });

    // Handle MARKET order that can't be fully filled → cancel remainder
    if (takerOrderDoc.type === ORDER_TYPES.MARKET && takerRemaining > 0) {
      await this.cancelOrder(takerOrderDoc._id.toString(), takerOrderDoc.userId.toString());
    }

    return fills;
  }

  /**
   * Execute a single fill between taker and maker.
   * All DB writes inside a Mongoose transaction.
   */
  async _executeFill({ takerOrderDoc, makerOrderId, makerUserId, fillQty, fillPrice, market }) {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const marketId = market._id;
      const outcome = takerOrderDoc.outcome;
      const totalValueCents = fillQty * fillPrice;

      // ── Load maker order ──────────────────────────────────────────────────
      const makerOrder = await db.order.findById(makerOrderId).session(session);
      if (!makerOrder) throw new Error("Maker order not found in DB");

      // ── Update maker order ────────────────────────────────────────────────
      const makerNewFilled = makerOrder.filledQuantity + fillQty;
      const makerNewRemaining = makerOrder.quantity - makerNewFilled;
      await db.order.findByIdAndUpdate(
        makerOrderId,
        {
          filledQuantity: makerNewFilled,
          remainingQuantity: makerNewRemaining,
          status: makerNewRemaining === 0 ? ORDER_STATUSES.FILLED : ORDER_STATUSES.PARTIALLY_FILLED,
          ...(makerNewRemaining === 0 && { closedAt: new Date() }),
        },
        { session }
      );

      // ── Create Trade record ───────────────────────────────────────────────
      const [trade] = await db.trade.create(
        [
          {
            marketId,
            takerOrderId: takerOrderDoc._id,
            takerUserId: takerOrderDoc.userId,
            makerOrderId,
            makerUserId,
            outcome,
            priceCents: fillPrice,
            quantity: fillQty,
            totalValueCents,
          },
        ],
        { session }
      );

      // ── Update wallet & position for TAKER ───────────────────────────────
      if (takerOrderDoc.side === ORDER_SIDES.BUY) {
        // Taker is buying: debit reserved funds (may be at higher price than fill)
        const actualCost = fillPrice * fillQty;
        const reservedForFill = takerOrderDoc.priceCents * fillQty;
        const refund = reservedForFill - actualCost;

        const takerWallet = await db.wallet.findOne({ userId: takerOrderDoc.userId }).session(session);
        await takerWallet.debitReserved(reservedForFill, trade._id.toString(), session);
        if (refund > 0) {
          // Refund excess reservation (paid less than bid price)
          await takerWallet.creditAvailable(refund, "ORDER_RELEASE", trade._id.toString(), "Price improvement refund", session);
        }

        // Update taker's YES/NO position
        await this._upsertPosition(takerOrderDoc.userId, marketId, outcome, "BUY", fillQty, fillPrice, session);
      } else {
        // Taker is selling: credit proceeds
        const takerWallet = await db.wallet.findOne({ userId: takerOrderDoc.userId }).session(session);
        await takerWallet.creditAvailable(totalValueCents, "TRADE_CREDIT", trade._id.toString(), `Sell fill ${trade._id}`, session);
        await this._upsertPosition(takerOrderDoc.userId, marketId, outcome, "SELL", fillQty, fillPrice, session);
      }

      // ── Update wallet & position for MAKER ───────────────────────────────
      if (makerOrder.side === ORDER_SIDES.BUY) {
        const actualCost = fillPrice * fillQty;
        const reservedForFill = makerOrder.priceCents * fillQty;
        const refund = reservedForFill - actualCost;

        const makerWallet = await db.wallet.findOne({ userId: makerUserId }).session(session);
        await makerWallet.debitReserved(reservedForFill, trade._id.toString(), session);
        if (refund > 0) {
          await makerWallet.creditAvailable(refund, "ORDER_RELEASE", trade._id.toString(), "Price improvement refund", session);
        }
        await this._upsertPosition(makerUserId, marketId, outcome, "BUY", fillQty, fillPrice, session);
      } else {
        const makerWallet = await db.wallet.findOne({ userId: makerUserId }).session(session);
        await makerWallet.creditAvailable(totalValueCents, "TRADE_CREDIT", trade._id.toString(), `Sell fill ${trade._id}`, session);
        await this._upsertPosition(makerUserId, marketId, outcome, "SELL", fillQty, fillPrice, session);
      }

      // ── Update market stats ───────────────────────────────────────────────
      const statsField = outcome === OUTCOMES.YES ? "yesStats" : "noStats";
      await db.market.findByIdAndUpdate(
        marketId,
        {
          $inc: {
            totalVolumeCents: totalValueCents,
            [`${statsField}.volumeTotal`]: fillQty,
            [`${statsField}.volume24h`]: fillQty,
          },
          $set: {
            [`${statsField}.lastPrice`]: fillPrice,
          },
          $push: {
            priceHistory: {
              $each: [{ yesPrice: outcome === "YES" ? fillPrice : 100 - fillPrice, volume: fillQty, timestamp: new Date() }],
              $slice: -2000,
            },
          },
        },
        { session }
      );

      await session.commitTransaction();

      // Update metrics
      tradesTotal.inc({ market_id: marketId.toString() });
      tradingVolumeCents.inc({ market_id: marketId.toString() }, totalValueCents);

      return {
        tradeId: trade._id,
        priceCents: fillPrice,
        quantity: fillQty,
        totalValueCents,
        outcome,
        executedAt: trade.executedAt,
      };
    } catch (err) {
      await session.abortTransaction();
      logger.error(`Fill transaction aborted: ${err.message}`);
      throw err;
    } finally {
      session.endSession();
    }
  }

  /**
   * Upsert a user's position after a fill.
   */
  async _upsertPosition(userId, marketId, outcome, fillSide, fillQty, fillPriceCents, session) {
    let position = await db.position.findOne({ userId, marketId, outcome }).session(session);

    if (!position) {
      position = new db.position({ userId, marketId, outcome, quantity: 0, avgCostCents: 0, totalCostCents: 0 });
    }

    if (fillSide === ORDER_SIDES.BUY) {
      position.applyBuyFill(fillQty, fillPriceCents);
    } else {
      position.applySellFill(fillQty);
    }

    return position.save(session ? { session } : {});
  }

  /**
   * Cancel an open order. Releases reserved funds.
   */
  async cancelOrder(orderId, userId) {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const order = await db.order.findOne({ _id: orderId, userId }).session(session);
      if (!order) throw new ValidationError("Order not found");
      if ([ORDER_STATUSES.FILLED, ORDER_STATUSES.CANCELLED].includes(order.status)) {
        throw new ValidationError(`Order is already ${order.status}`);
      }

      // Release reserved funds if BUY order
      if (order.side === ORDER_SIDES.BUY && order.reservedCents > 0) {
        const remainingReserved = Math.round(
          (order.remainingQuantity / order.quantity) * order.reservedCents
        );
        const wallet = await db.wallet.findOne({ userId }).session(session);
        await wallet.releaseFunds(remainingReserved, orderId, session);
      }

      // Remove from order book
      const book = orderBookService.getBook(order.marketId, order.outcome);
      book.removeOrder(orderId, order.side);

      // Update order status
      await db.order.findByIdAndUpdate(
        orderId,
        { status: ORDER_STATUSES.CANCELLED, closedAt: new Date() },
        { session }
      );

      await session.commitTransaction();
      logger.info(`🚫 Order cancelled: ${orderId} by user ${userId}`);

      return { success: true, orderId };
    } catch (err) {
      await session.abortTransaction();
      throw err;
    } finally {
      session.endSession();
    }
  }

  /**
   * Broadcast order book snapshot via WebSocket.
   */
  _broadcastSnapshot(io, marketId, outcome, book) {
    const { WS_ROOMS, WS_EVENTS } = require("../config/constants");
    io.to(WS_ROOMS.MARKET(marketId)).emit(WS_EVENTS.ORDERBOOK_UPDATE, book.getSnapshot());
  }

  /**
   * Broadcast a trade execution via WebSocket.
   */
  _broadcastTrade(io, marketId, outcome, fill) {
    const { WS_ROOMS, WS_EVENTS } = require("../config/constants");
    io.to(WS_ROOMS.MARKET(marketId)).emit(WS_EVENTS.TRADE_EXECUTED, { ...fill, marketId });
  }
}

module.exports = new MatchingEngine();