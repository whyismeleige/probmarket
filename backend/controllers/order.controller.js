// controllers/order.controller.js
const asyncHandler = require("../middleware/asyncHandler");
const db = require("../models");
const matchingEngine = require("../services/matchingEngine.service");
const { NotFoundError, ForbiddenError } = require("../utils/error.utils");
const { ORDER_STATUSES, MAX_ORDERS_PER_USER_PER_MARKET } = require("../config/constants");

/**
 * @route   POST /api/orders
 * @desc    Place a new order (limit or market)
 * @access  Private
 */
exports.placeOrder = asyncHandler(async (req, res) => {
  const { marketId, outcome, side, type, priceCents, quantity, clientOrderId } = req.body;
  const io = req.app.get("io");

  // Enforce max open orders per user per market
  const openOrderCount = await db.order.countDocuments({
    userId: req.user._id,
    marketId,
    status: { $in: [ORDER_STATUSES.OPEN, ORDER_STATUSES.PARTIALLY_FILLED] },
  });

  if (openOrderCount >= MAX_ORDERS_PER_USER_PER_MARKET) {
    return res.status(429).json({
      success: false,
      message: `Max ${MAX_ORDERS_PER_USER_PER_MARKET} open orders per market allowed`,
    });
  }

  const result = await matchingEngine.placeOrder({
    userId: req.user._id,
    marketId,
    outcome,
    side,
    type: type || "LIMIT",
    priceCents,
    quantity,
    io,
  });

  // Notify the placing user via WebSocket
  const { WS_ROOMS, WS_EVENTS } = require("../config/constants");
  io?.to(WS_ROOMS.USER(req.user._id)).emit(WS_EVENTS.ORDER_UPDATE, {
    order: result.order,
    fills: result.fills,
  });

  return res.status(201).json({
    success: true,
    message:
      result.fills.length > 0
        ? `Order placed and filled ${result.fills.length} time(s)`
        : "Order placed and waiting for match",
    data: {
      order: result.order,
      fills: result.fills,
    },
  });
});

/**
 * @route   DELETE /api/orders/:orderId
 * @desc    Cancel an open order
 * @access  Private
 */
exports.cancelOrder = asyncHandler(async (req, res) => {
  const { orderId } = req.params;

  // Verify ownership
  const order = await db.order.findById(orderId);
  if (!order) throw new NotFoundError("Order not found");
  if (order.userId.toString() !== req.user._id.toString()) {
    throw new ForbiddenError("You do not own this order");
  }

  const result = await matchingEngine.cancelOrder(orderId, req.user._id.toString());

  const io = req.app.get("io");
  const { WS_ROOMS, WS_EVENTS } = require("../config/constants");
  io?.to(WS_ROOMS.USER(req.user._id)).emit(WS_EVENTS.ORDER_UPDATE, {
    orderId,
    status: "CANCELLED",
  });

  return res.status(200).json({ success: true, message: "Order cancelled", data: result });
});

/**
 * @route   GET /api/orders
 * @desc    Get user's orders with filters
 * @access  Private
 */
exports.getMyOrders = asyncHandler(async (req, res) => {
  const {
    status,
    marketId,
    outcome,
    side,
    page = 1,
    limit = 20,
  } = req.query;

  const filter = { userId: req.user._id };
  if (status) filter.status = status;
  if (marketId) filter.marketId = marketId;
  if (outcome) filter.outcome = outcome;
  if (side) filter.side = side;

  const pageNum = parseInt(page);
  const limitNum = Math.min(100, parseInt(limit));
  const skip = (pageNum - 1) * limitNum;

  const [orders, total] = await Promise.all([
    db.order
      .find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .populate("marketId", "title category status slug"),
    db.order.countDocuments(filter),
  ]);

  return res.status(200).json({
    success: true,
    data: {
      orders,
      pagination: { page: pageNum, limit: limitNum, total, pages: Math.ceil(total / limitNum) },
    },
  });
});

/**
 * @route   GET /api/orders/:orderId
 * @desc    Get a specific order
 * @access  Private
 */
exports.getOrder = asyncHandler(async (req, res) => {
  const order = await db.order
    .findById(req.params.orderId)
    .populate("marketId", "title category status");

  if (!order) throw new NotFoundError("Order not found");
  if (order.userId.toString() !== req.user._id.toString()) {
    throw new ForbiddenError("Access denied");
  }

  // Attach fills for this order
  const fills = await db.trade.find({
    $or: [{ takerOrderId: order._id }, { makerOrderId: order._id }],
  }).select("priceCents quantity totalValueCents executedAt");

  return res.status(200).json({ success: true, data: { order, fills } });
});

/**
 * @route   GET /api/orders/market/:marketId
 * @desc    Get all open orders for a specific market (for a user)
 * @access  Private
 */
exports.getMarketOrders = asyncHandler(async (req, res) => {
  const orders = await db.order.find({
    userId: req.user._id,
    marketId: req.params.marketId,
    status: { $in: [ORDER_STATUSES.OPEN, ORDER_STATUSES.PARTIALLY_FILLED] },
  }).sort({ createdAt: -1 });

  return res.status(200).json({ success: true, data: { orders } });
});