// models/Order.model.js
// Represents a single order in the prediction market order book
//
// Price mechanics:
//   - All prices are integers in CENTS (1–99)
//   - A BUY YES at price 60 means: "I'll pay 60¢ per YES share"
//   - If it resolves YES, that share is worth 100¢ → profit 40¢
//   - Cost to place BUY YES order = priceCents × quantity (reserved from wallet)

const mongoose = require("mongoose");
const { ORDER_SIDES, ORDER_TYPES, ORDER_STATUSES, OUTCOMES } = require("../config/constants");

const OrderSchema = new mongoose.Schema(
  {
    // ─── Core Identity ─────────────────────────────────────────────
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    marketId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Market",
      required: true,
      index: true,
    },

    // ─── Order Specification ───────────────────────────────────────
    outcome: {
      type: String,
      enum: Object.values(OUTCOMES),
      required: true,
    },
    side: {
      type: String,
      enum: Object.values(ORDER_SIDES),
      required: true,
    },
    type: {
      type: String,
      enum: Object.values(ORDER_TYPES),
      required: true,
      default: ORDER_TYPES.LIMIT,
    },
    // Price in cents (1–99). Null for MARKET orders.
    priceCents: {
      type: Number,
      min: [1, "Price must be at least 1¢"],
      max: [99, "Price cannot exceed 99¢"],
      required: function () {
        return this.type === ORDER_TYPES.LIMIT;
      },
    },
    // Total quantity of shares requested
    quantity: {
      type: Number,
      required: true,
      min: [1, "Quantity must be at least 1 share"],
      max: [100000, "Quantity cannot exceed 100,000 shares"],
      validate: {
        validator: Number.isInteger,
        message: "Quantity must be a whole number",
      },
    },

    // ─── Fill Tracking ─────────────────────────────────────────────
    filledQuantity: { type: Number, default: 0 },
    remainingQuantity: { type: Number }, // Set in pre-save

    // Amount of wallet funds reserved for this order (in cents)
    reservedCents: { type: Number, required: true },

    // Average fill price (weighted average across all fills)
    avgFillPriceCents: { type: Number, default: null },

    // ─── Status ────────────────────────────────────────────────────
    status: {
      type: String,
      enum: Object.values(ORDER_STATUSES),
      default: ORDER_STATUSES.OPEN,
      index: true,
    },

    // Timestamp order became fully filled or cancelled
    closedAt: { type: Date, default: null },

    // Optional: client-provided order ID for idempotency
    clientOrderId: {
      type: String,
      sparse: true,
      index: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ─── Indexes ──────────────────────────────────────────────────────────────────
// Critical for order book queries: find open orders for a market/outcome/side sorted by price+time
OrderSchema.index({ marketId: 1, outcome: 1, side: 1, status: 1, priceCents: 1, createdAt: 1 });
OrderSchema.index({ userId: 1, status: 1, createdAt: -1 });
OrderSchema.index({ marketId: 1, userId: 1, status: 1 });

// ─── Hooks ────────────────────────────────────────────────────────────────────
OrderSchema.pre("save", function (next) {
  this.remainingQuantity = this.quantity - this.filledQuantity;
  if (this.remainingQuantity === 0 && this.status === ORDER_STATUSES.OPEN) {
    this.status = ORDER_STATUSES.FILLED;
    this.closedAt = new Date();
  } else if (this.filledQuantity > 0 && this.remainingQuantity > 0) {
    this.status = ORDER_STATUSES.PARTIALLY_FILLED;
  }
  next();
});

// ─── Virtuals ─────────────────────────────────────────────────────────────────
OrderSchema.virtual("totalCostCents").get(function () {
  return this.priceCents * this.quantity;
});

OrderSchema.virtual("fillPercent").get(function () {
  if (!this.quantity) return 0;
  return Math.round((this.filledQuantity / this.quantity) * 100);
});

module.exports = mongoose.model("Order", OrderSchema);