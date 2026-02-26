// controllers/position.controller.js
const asyncHandler = require("../middleware/asyncHandler");
const db = require("../models");
const orderBookService = require("../services/orderBook.service");

/**
 * @route   GET /api/positions
 * @desc    Get all of user's current positions (portfolio)
 * @access  Private
 */
exports.getMyPositions = asyncHandler(async (req, res) => {
  const { settled } = req.query;
  const filter = { userId: req.user._id, quantity: { $gt: 0 } };
  if (settled !== undefined) filter.settled = settled === "true";

  const positions = await db.position
    .find(filter)
    .populate("marketId", "title category status resolvedOutcome closesAt slug yesStats noStats")
    .sort({ createdAt: -1 });

  // Attach current market price to each position for P&L
  const positionsWithPnl = positions.map((pos) => {
    const obj = pos.toObject({ virtuals: true });
    const market = pos.marketId;

    if (market && market.status === "OPEN") {
      // Use the live order book best mid price
      const book = orderBookService.getBook(market._id, pos.outcome);
      const bestBid = book.getBestBid();
      const bestAsk = book.getBestAsk();
      const midPrice = bestBid && bestAsk ? Math.round((bestBid + bestAsk) / 2) : null;
      const lastPrice = pos.outcome === "YES" ? market.yesStats?.lastPrice : market.noStats?.lastPrice;
      const currentPriceCents = midPrice || lastPrice || pos.avgCostCents;

      obj.currentPriceCents = currentPriceCents;
      obj.currentValueCents = pos.quantity * currentPriceCents;
      obj.unrealizedPnlCents = obj.currentValueCents - pos.totalCostCents;
      obj.unrealizedPnlPercent =
        pos.totalCostCents > 0
          ? ((obj.unrealizedPnlCents / pos.totalCostCents) * 100).toFixed(2)
          : "0.00";
    } else if (pos.settled) {
      obj.currentPriceCents = pos.settlementCreditCents / (pos.quantity || 1);
      obj.currentValueCents = pos.settlementCreditCents;
      obj.unrealizedPnlCents = pos.settlementCreditCents - pos.totalCostCents;
    }

    return obj;
  });

  // Compute portfolio totals
  const totalInvestedCents = positionsWithPnl.reduce((s, p) => s + (p.totalCostCents || 0), 0);
  const totalCurrentValueCents = positionsWithPnl.reduce((s, p) => s + (p.currentValueCents || 0), 0);
  const totalUnrealizedPnlCents = totalCurrentValueCents - totalInvestedCents;

  return res.status(200).json({
    success: true,
    data: {
      positions: positionsWithPnl,
      summary: {
        totalPositions: positionsWithPnl.length,
        totalInvestedCents,
        totalCurrentValueCents,
        totalUnrealizedPnlCents,
        totalInvested: (totalInvestedCents / 100).toFixed(2),
        totalCurrentValue: (totalCurrentValueCents / 100).toFixed(2),
        totalUnrealizedPnl: (totalUnrealizedPnlCents / 100).toFixed(2),
      },
    },
  });
});

/**
 * @route   GET /api/positions/:marketId
 * @desc    Get user's positions in a specific market
 * @access  Private
 */
exports.getMarketPosition = asyncHandler(async (req, res) => {
  const positions = await db.position.find({
    userId: req.user._id,
    marketId: req.params.marketId,
  });

  return res.status(200).json({ success: true, data: { positions } });
});

/**
 * @route   GET /api/positions/history
 * @desc    Get trade history (fills) for user
 * @access  Private
 */
exports.getTradeHistory = asyncHandler(async (req, res) => {
  const { page = 1, limit = 50, marketId } = req.query;
  const skip = (parseInt(page) - 1) * parseInt(limit);

  const filter = {
    $or: [{ takerUserId: req.user._id }, { makerUserId: req.user._id }],
  };
  if (marketId) filter.marketId = marketId;

  const [trades, total] = await Promise.all([
    db.trade
      .find(filter)
      .sort({ executedAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate("marketId", "title category status"),
    db.trade.countDocuments(filter),
  ]);

  return res.status(200).json({
    success: true,
    data: {
      trades,
      pagination: { page: parseInt(page), limit: parseInt(limit), total },
    },
  });
});