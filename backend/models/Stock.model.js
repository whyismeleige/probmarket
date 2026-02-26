// models/Stock.model.js
// Represents a simulated stock for the live market demo

const mongoose = require("mongoose");

const HistoryPointSchema = new mongoose.Schema(
  {
    price: { type: Number, required: true },
    timestamp: { type: Date, default: Date.now },
  },
  { _id: false }
);

const StockSchema = new mongoose.Schema(
  {
    symbol: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
      maxlength: 6,
    },
    companyName: {
      type: String,
      required: true,
      trim: true,
    },
    currentPrice: {
      type: Number,
      required: true,
      min: 1,
    },
    previousClosePrice: {
      type: Number,
      required: true,
    },
    sector: {
      type: String,
      default: "Technology",
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    // Capped price history (last 500 points, ~16 min at 2s ticks)
    history: {
      type: [HistoryPointSchema],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

StockSchema.index({ isActive: 1 });
StockSchema.index({ symbol: 1 });

module.exports = mongoose.model("Stock", StockSchema);