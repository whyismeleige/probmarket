// controllers/market.controller.js
const asyncHandler = require("../middleware/asyncHandler");
const db = require("../models");
const orderBookService = require("../services/orderBook.service");
const settlementService = require("../services/settlement.service");
const { NotFoundError, ForbiddenError, ValidationError } = require("../utils/error.utils");
const { MARKET_STATUSES, ORDERBOOK_DEPTH_LEVELS } = require("../config/constants");

/**
 * @route   GET /api/markets
 * @desc    List markets with filters, pagination, and sort
 * @access  Public
 */
exports.listMarkets = asyncHandler(async (req, res) => {
  const {
    status = "OPEN",
    category,
    search,
    featured,
    page = 1,
    limit = 20,
    sort = "createdAt",
    order = "desc",
  } = req.query;

  const filter = {};
  if (status) filter.status = status;
  if (category) filter.category = category;
  if (featured === "true") filter.featured = true;
  if (search) filter.$text = { $search: search };

  const pageNum = Math.max(1, parseInt(page));
  const limitNum = Math.min(50, Math.max(1, parseInt(limit)));
  const skip = (pageNum - 1) * limitNum;
  const sortOrder = order === "asc" ? 1 : -1;

  const [markets, total] = await Promise.all([
    db.market
      .find(filter)
      .select("-priceHistory -__v")
      .sort({ [sort]: sortOrder })
      .skip(skip)
      .limit(limitNum)
      .populate("createdBy", "username displayName"),
    db.market.countDocuments(filter),
  ]);

  // Attach live order book stats
  const marketsWithStats = markets.map((m) => {
    const obj = m.toObject({ virtuals: true });
    if (m.status === MARKET_STATUSES.OPEN) {
      const yesBook = orderBookService.getBook(m._id, "YES");
      const noBook = orderBookService.getBook(m._id, "NO");
      obj.liveStats = {
        yesBestBid: yesBook.getBestBid(),
        yesBestAsk: yesBook.getBestAsk(),
        noBestBid: noBook.getBestBid(),
        noBestAsk: noBook.getBestAsk(),
      };
    }
    return obj;
  });

  return res.status(200).json({
    success: true,
    data: {
      markets: marketsWithStats,
      pagination: { page: pageNum, limit: limitNum, total, pages: Math.ceil(total / limitNum) },
    },
  });
});

/**
 * @route   GET /api/markets/:id
 * @desc    Get single market with order book snapshot and recent trades
 * @access  Public
 */
exports.getMarket = asyncHandler(async (req, res) => {
  const market = await db.market
    .findById(req.params.id)
    .populate("createdBy", "username displayName")
    .populate("resolvedBy", "username displayName");

  if (!market) throw new NotFoundError("Market not found");

  const obj = market.toObject({ virtuals: true });

  // Attach order book snapshot
  obj.orderBook = orderBookService.getMarketSnapshot(market._id);

  // Attach recent trades (last 50)
  obj.recentTrades = await db.trade
    .find({ marketId: market._id })
    .sort({ executedAt: -1 })
    .limit(50)
    .select("outcome priceCents quantity executedAt");

  // If user is logged in, attach their positions
  if (req.user) {
    const positions = await db.position.find({ userId: req.user._id, marketId: market._id });
    obj.userPositions = positions;

    const openOrders = await db.order.find({
      userId: req.user._id,
      marketId: market._id,
      status: { $in: ["OPEN", "PARTIALLY_FILLED"] },
    }).sort({ createdAt: -1 });
    obj.userOpenOrders = openOrders;
  }

  return res.status(200).json({ success: true, data: { market: obj } });
});

/**
 * @route   GET /api/markets/:id/history
 * @desc    Get price history for charts
 * @access  Public
 */
exports.getMarketHistory = asyncHandler(async (req, res) => {
  const { range = "1D" } = req.query;
  const now = new Date();
  const rangeMap = {
    "1H": 60 * 60 * 1000,
    "6H": 6 * 60 * 60 * 1000,
    "1D": 24 * 60 * 60 * 1000,
    "1W": 7 * 24 * 60 * 60 * 1000,
    "1M": 30 * 24 * 60 * 60 * 1000,
    "ALL": null,
  };
  const cutoff = rangeMap[range] ? new Date(now - rangeMap[range]) : new Date(0);

  const market = await db.market
    .findById(req.params.id)
    .select("priceHistory title status resolvedOutcome");
  if (!market) throw new NotFoundError("Market not found");

  const history = market.priceHistory.filter((p) => p.timestamp >= cutoff);

  return res.status(200).json({ success: true, data: { history } });
});

/**
 * @route   GET /api/markets/:id/orderbook
 * @desc    Live order book depth snapshot
 * @access  Public
 */
exports.getOrderBook = asyncHandler(async (req, res) => {
  const { depth = ORDERBOOK_DEPTH_LEVELS } = req.query;
  const market = await db.market.findById(req.params.id).select("status title");
  if (!market) throw new NotFoundError("Market not found");

  const snapshot = {
    YES: orderBookService.getBook(market._id, "YES").getSnapshot(parseInt(depth)),
    NO: orderBookService.getBook(market._id, "NO").getSnapshot(parseInt(depth)),
  };

  return res.status(200).json({ success: true, data: { orderBook: snapshot } });
});

/**
 * @route   GET /api/markets/:id/trades
 * @desc    Trade history for a market
 * @access  Public
 */
exports.getMarketTrades = asyncHandler(async (req, res) => {
  const { page = 1, limit = 50 } = req.query;
  const skip = (parseInt(page) - 1) * parseInt(limit);

  const [trades, total] = await Promise.all([
    db.trade
      .find({ marketId: req.params.id })
      .sort({ executedAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .select("outcome priceCents quantity totalValueCents executedAt"),
    db.trade.countDocuments({ marketId: req.params.id }),
  ]);

  return res.status(200).json({
    success: true,
    data: { trades, pagination: { page: parseInt(page), total } },
  });
});

/**
 * @route   POST /api/markets
 * @desc    Create a new prediction market (admin/moderator)
 * @access  Private (admin)
 */
exports.createMarket = asyncHandler(async (req, res) => {
  const { title, description, category, resolutionCriteria, closesAt, tags, imageUrl } = req.body;

  const market = await db.market.create({
    title,
    description,
    category,
    resolutionCriteria,
    closesAt: new Date(closesAt),
    tags: tags || [],
    imageUrl: imageUrl || null,
    createdBy: req.user._id,
    status: MARKET_STATUSES.OPEN,
  });

  // Initialize order book for new market
  await orderBookService.initMarket(market._id);

  return res.status(201).json({ success: true, data: { market } });
});

/**
 * @route   PATCH /api/markets/:id
 * @desc    Update market (admin only)
 * @access  Private (admin)
 */
exports.updateMarket = asyncHandler(async (req, res) => {
  const market = await db.market.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });
  if (!market) throw new NotFoundError("Market not found");
  return res.status(200).json({ success: true, data: { market } });
});

/**
 * @route   POST /api/markets/:id/resolve
 * @desc    Resolve a market (admin/moderator only)
 * @access  Private (admin)
 */
exports.resolveMarket = asyncHandler(async (req, res) => {
  const { outcome } = req.body;
  const market = await db.market.findById(req.params.id);

  if (!market) throw new NotFoundError("Market not found");
  if (market.status === MARKET_STATUSES.RESOLVED) {
    throw new ValidationError("Market is already resolved");
  }
  if (market.status === MARKET_STATUSES.CANCELLED) {
    throw new ValidationError("Cannot resolve a cancelled market");
  }

  const io = req.app.get("io");
  const result = await settlementService.resolveMarket(
    market._id,
    outcome,
    req.user._id,
    io
  );

  return res.status(200).json({
    success: true,
    message: `Market resolved → ${outcome}`,
    data: result,
  });
});

/**
 * @route   POST /api/markets/:id/cancel
 * @desc    Cancel a market (admin only)
 * @access  Private (admin)
 */
exports.cancelMarket = asyncHandler(async (req, res) => {
  const market = await db.market.findById(req.params.id);
  if (!market) throw new NotFoundError("Market not found");

  const io = req.app.get("io");
  const result = await settlementService.cancelMarket(market._id, req.user._id, io);

  return res.status(200).json({
    success: true,
    message: "Market cancelled and funds refunded",
    data: result,
  });
});

/**
 * @route   GET /api/markets/categories
 * @desc    Get all available categories with market counts
 * @access  Public
 */
exports.getCategories = asyncHandler(async (req, res) => {
  const counts = await db.market.aggregate([
    { $match: { status: MARKET_STATUSES.OPEN } },
    { $group: { _id: "$category", count: { $sum: 1 } } },
    { $sort: { count: -1 } },
  ]);

  return res.status(200).json({ success: true, data: { categories: counts } });
});