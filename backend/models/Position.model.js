// models/Position.model.js
// Tracks a user's current holdings of YES or NO shares in a specific market.
// After market resolution, positions are settled and marked accordingly.

const mongoose = require("mongoose");

const PositionSchema = new mongoose.Schema(
  {
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
    outcome: {
      type: String,
      enum: ["YES", "NO"],
      required: true,
    },
    // Total shares owned
    quantity: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    // Weighted average cost (in cents per share) — for P&L calculation
    avgCostCents: {
      type: Number,
      required: true,
      default: 0,
    },
    // Total amount spent acquiring these shares (in cents)
    totalCostCents: {
      type: Number,
      required: true,
      default: 0,
    },
    // Settlement
    settled: { type: Boolean, default: false },
    settledAt: { type: Date, default: null },
    settlementCreditCents: { type: Number, default: 0 }, // How much was paid out
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ─── Indexes ──────────────────────────────────────────────────────────────────
// Unique: one position record per user per market per outcome
PositionSchema.index({ userId: 1, marketId: 1, outcome: 1 }, { unique: true });
PositionSchema.index({ marketId: 1, settled: 1 });

// ─── Virtuals ─────────────────────────────────────────────────────────────────
PositionSchema.virtual("currentValueCents").get(function () {
  // This would be populated by the controller using current market price
  // Can't compute here without current price
  return null;
});

PositionSchema.virtual("unrealizedPnlCents").get(function () {
  return null; // Same — computed in controller
});

// ─── Methods ──────────────────────────────────────────────────────────────────
/**
 * Update position after a BUY fill.
 * Uses weighted average cost basis.
 */
PositionSchema.methods.applyBuyFill = function (fillQuantity, fillPriceCents) {
  const newTotalCost = this.totalCostCents + fillQuantity * fillPriceCents;
  const newQuantity = this.quantity + fillQuantity;
  this.avgCostCents = newQuantity > 0 ? Math.round(newTotalCost / newQuantity) : 0;
  this.quantity = newQuantity;
  this.totalCostCents = newTotalCost;
};

/**
 * Update position after a SELL fill.
 * Reduces quantity; avgCost stays the same (realized P&L is elsewhere).
 */
PositionSchema.methods.applySellFill = function (fillQuantity) {
  const costReduction = Math.round(this.avgCostCents * fillQuantity);
  this.quantity -= fillQuantity;
  this.totalCostCents = Math.max(0, this.totalCostCents - costReduction);
  if (this.quantity === 0) {
    this.avgCostCents = 0;
    this.totalCostCents = 0;
  }
};

module.exports = mongoose.model("Position", PositionSchema);