// models/Trade.model.js
// A Trade represents a single fill event — when a BUY order matches a SELL order.
// One order match can produce multiple Trade records if filled in parts.

const mongoose = require("mongoose");

const TradeSchema = new mongoose.Schema(
  {
    marketId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Market",
      required: true,
      index: true,
    },
    // The aggressor (the order that triggered the match — arrived second)
    takerOrderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      required: true,
    },
    takerUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    // The passive order (was already sitting in the book)
    makerOrderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      required: true,
    },
    makerUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    // ─── Fill Details ──────────────────────────────────────────────
    outcome: {
      type: String,
      enum: ["YES", "NO"],
      required: true,
    },
    // Price at which the trade executed (maker's price)
    priceCents: {
      type: Number,
      required: true,
      min: 1,
      max: 99,
    },
    // Number of shares traded
    quantity: {
      type: Number,
      required: true,
      min: 1,
    },
    // Total value of the trade in cents
    totalValueCents: {
      type: Number,
      required: true,
    },
    executedAt: { type: Date, default: Date.now, index: true },
  },
  { timestamps: true }
);

// ─── Indexes ──────────────────────────────────────────────────────────────────
TradeSchema.index({ marketId: 1, executedAt: -1 });
TradeSchema.index({ takerUserId: 1, executedAt: -1 });
TradeSchema.index({ makerUserId: 1, executedAt: -1 });

// ─── Hooks ────────────────────────────────────────────────────────────────────
TradeSchema.pre("save", function (next) {
  this.totalValueCents = this.priceCents * this.quantity;
  next();
});

module.exports = mongoose.model("Trade", TradeSchema);