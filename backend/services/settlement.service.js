// services/settlement.service.js
//
// Handles market resolution: when a market resolves, all positions
// in the winning outcome receive 100¢ per share (payout).
// All open orders are cancelled and reserved funds released.

const mongoose = require("mongoose");
const db = require("../models");
const orderBookService = require("./orderBook.service");
const { ORDER_STATUSES, PAYOUT_PER_SHARE, MARKET_STATUSES, WS_ROOMS, WS_EVENTS } = require("../config/constants");
const logger = require("../utils/logger");

class SettlementService {
  /**
   * Resolve a market and pay out all winning positions.
   *
   * @param {string} marketId
   * @param {"YES"|"NO"} winningOutcome
   * @param {string} resolvedByUserId
   * @param {Object} [io] - Socket.IO instance
   */
  async resolveMarket(marketId, winningOutcome, resolvedByUserId, io) {
    logger.info(`🏁 Resolving market ${marketId} → ${winningOutcome}`);

    // ── Step 1: Cancel all open orders and release reserved funds ────────────
    const openOrders = await db.order.find({
      marketId,
      status: { $in: [ORDER_STATUSES.OPEN, ORDER_STATUSES.PARTIALLY_FILLED] },
    });

    logger.info(`🚫 Cancelling ${openOrders.length} open orders for market ${marketId}`);

    // Process in batches to avoid overwhelming DB
    const BATCH = 50;
    for (let i = 0; i < openOrders.length; i += BATCH) {
      const batch = openOrders.slice(i, i + BATCH);
      await Promise.all(
        batch.map((order) => this._cancelOrderOnResolution(order))
      );
    }

    // ── Step 2: Remove market from order book ─────────────────────────────────
    await orderBookService.removeMarket(marketId);

    // ── Step 3: Pay out winning positions ─────────────────────────────────────
    const winningPositions = await db.position.find({
      marketId,
      outcome: winningOutcome,
      quantity: { $gt: 0 },
      settled: false,
    });

    logger.info(`💰 Settling ${winningPositions.length} winning positions`);

    let totalPayoutCents = 0;
    const settledUsers = new Set();

    for (let i = 0; i < winningPositions.length; i += BATCH) {
      const batch = winningPositions.slice(i, i + BATCH);
      await Promise.all(
        batch.map(async (position) => {
          const payoutCents = position.quantity * PAYOUT_PER_SHARE;
          totalPayoutCents += payoutCents;

          const session = await mongoose.startSession();
          session.startTransaction();
          try {
            const wallet = await db.wallet.findOne({ userId: position.userId }).session(session);
            await wallet.creditAvailable(
              payoutCents,
              "SETTLEMENT_CREDIT",
              marketId.toString(),
              `Market ${marketId} settled → ${winningOutcome} winner: ${position.quantity} shares × 100¢`,
              session
            );

            await db.position.findByIdAndUpdate(
              position._id,
              { settled: true, settledAt: new Date(), settlementCreditCents: payoutCents },
              { session }
            );

            await session.commitTransaction();
            settledUsers.add(position.userId.toString());

            // Notify user via WebSocket
            if (io) {
              io.to(WS_ROOMS.USER(position.userId)).emit(WS_EVENTS.WALLET_UPDATE, {
                type: "SETTLEMENT_CREDIT",
                marketId,
                outcome: winningOutcome,
                payoutCents,
                shares: position.quantity,
              });
            }
          } catch (err) {
            await session.abortTransaction();
            logger.error(`Settlement error for position ${position._id}: ${err.message}`);
          } finally {
            session.endSession();
          }
        })
      );
    }

    // ── Step 4: Mark losing positions as settled (no payout) ─────────────────
    const losingOutcome = winningOutcome === "YES" ? "NO" : "YES";
    await db.position.updateMany(
      { marketId, outcome: losingOutcome, settled: false },
      { settled: true, settledAt: new Date(), settlementCreditCents: 0 }
    );

    // ── Step 5: Update market status ──────────────────────────────────────────
    await db.market.findByIdAndUpdate(marketId, {
      status: MARKET_STATUSES.RESOLVED,
      resolvedOutcome: winningOutcome,
      resolvedAt: new Date(),
      resolvedBy: resolvedByUserId,
    });

    // ── Step 6: Broadcast market resolution ───────────────────────────────────
    if (io) {
      io.to(WS_ROOMS.MARKET(marketId)).emit(WS_EVENTS.MARKET_UPDATE, {
        marketId,
        status: MARKET_STATUSES.RESOLVED,
        resolvedOutcome: winningOutcome,
      });
    }

    logger.info(
      `✅ Market ${marketId} resolved → ${winningOutcome}. ` +
      `Paid out ${totalPayoutCents}¢ to ${settledUsers.size} users.`
    );

    return { winningOutcome, settledPositions: winningPositions.length, totalPayoutCents };
  }

  /**
   * Cancel a single order without market resolution context.
   */
  async _cancelOrderOnResolution(order) {
    try {
      if (order.side === "BUY" && order.reservedCents > 0) {
        const remainingFraction = order.remainingQuantity / order.quantity;
        const toRelease = Math.round(remainingFraction * order.reservedCents);

        if (toRelease > 0) {
          const wallet = await db.wallet.findOne({ userId: order.userId });
          if (wallet) {
            await wallet.releaseFunds(toRelease, order._id.toString());
          }
        }
      }

      await db.order.findByIdAndUpdate(order._id, {
        status: ORDER_STATUSES.CANCELLED,
        closedAt: new Date(),
      });
    } catch (err) {
      logger.error(`Error cancelling order ${order._id} on resolution: ${err.message}`);
    }
  }

  /**
   * Cancel an entire market without resolution (e.g., invalid event).
   * Returns all reserved funds to users.
   */
  async cancelMarket(marketId, cancelledByUserId, io) {
    logger.info(`🚫 Cancelling market ${marketId}`);

    // Cancel all open orders (refund wallets)
    const openOrders = await db.order.find({
      marketId,
      status: { $in: [ORDER_STATUSES.OPEN, ORDER_STATUSES.PARTIALLY_FILLED] },
    });

    for (const order of openOrders) {
      await this._cancelOrderOnResolution(order);
    }

    // Return funds for filled positions (refund cost basis)
    const positions = await db.position.find({
      marketId,
      quantity: { $gt: 0 },
      settled: false,
    });

    for (const position of positions) {
      const session = await mongoose.startSession();
      session.startTransaction();
      try {
        const refundCents = position.totalCostCents;
        if (refundCents > 0) {
          const wallet = await db.wallet.findOne({ userId: position.userId }).session(session);
          await wallet.creditAvailable(
            refundCents,
            "SETTLEMENT_CREDIT",
            marketId.toString(),
            `Market ${marketId} cancelled — cost basis refund`,
            session
          );
        }
        await db.position.findByIdAndUpdate(position._id, { settled: true, settledAt: new Date(), settlementCreditCents: position.totalCostCents }, { session });
        await session.commitTransaction();
      } catch (err) {
        await session.abortTransaction();
        logger.error(`Cancel refund error for position ${position._id}: ${err.message}`);
      } finally {
        session.endSession();
      }
    }

    await orderBookService.removeMarket(marketId);

    await db.market.findByIdAndUpdate(marketId, {
      status: MARKET_STATUSES.CANCELLED,
      resolvedAt: new Date(),
      resolvedBy: cancelledByUserId,
    });

    if (io) {
      io.to(WS_ROOMS.MARKET(marketId)).emit(WS_EVENTS.MARKET_UPDATE, {
        marketId,
        status: MARKET_STATUSES.CANCELLED,
      });
    }

    return { cancelled: true, openOrdersCancelled: openOrders.length };
  }
}

module.exports = new SettlementService();