// models/Market.model.js
// A "Market" is a binary prediction question (e.g., "Will X happen by Y date?")
// Each market has two tradeable outcomes: YES and NO
// Prices are in cents (1-99) representing probability percentage

const mongoose = require("mongoose");
const { MARKET_STATUSES, MARKET_CATEGORIES } = require("../config/constants");

// Embedded schema for quick price snapshot (updated on every trade)
const OutcomeStatsSchema = new mongoose.Schema(
  {
    lastPrice: { type: Number, default: 50 },   // Last traded price in cents
    bestBid: { type: Number, default: null },    // Best BUY price
    bestAsk: { type: Number, default: null },    // Best SELL price
    volume24h: { type: Number, default: 0 },    // Shares traded in last 24h
    volumeTotal: { type: Number, default: 0 },  // Total shares traded
    openInterest: { type: Number, default: 0 }, // Total open order quantity
  },
  { _id: false }
);

// Price history point
const PricePointSchema = new mongoose.Schema(
  {
    yesPrice: { type: Number, required: true }, // YES price in cents
    volume: { type: Number, default: 0 },
    timestamp: { type: Date, default: Date.now },
  },
  { _id: false }
);

const MarketSchema = new mongoose.Schema(
  {
    // ─── Identity ──────────────────────────────────────────────────
    title: {
      type: String,
      required: [true, "Market title is required"],
      trim: true,
      maxlength: [200, "Title cannot exceed 200 characters"],
    },
    description: {
      type: String,
      required: [true, "Market description is required"],
      trim: true,
      maxlength: [2000, "Description cannot exceed 2000 characters"],
    },
    category: {
      type: String,
      required: true,
      enum: MARKET_CATEGORIES,
      default: "Other",
    },
    tags: [{ type: String, lowercase: true, trim: true }],
    imageUrl: { type: String, default: null },

    // ─── Creator ───────────────────────────────────────────────────
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // ─── Lifecycle ─────────────────────────────────────────────────
    status: {
      type: String,
      enum: Object.values(MARKET_STATUSES),
      default: MARKET_STATUSES.OPEN,
      index: true,
    },
    opensAt: { type: Date, default: Date.now },
    closesAt: {
      type: Date,
      required: [true, "Market close date is required"],
      index: true,
    },
    resolvedAt: { type: Date, default: null },

    // ─── Resolution ────────────────────────────────────────────────
    resolutionCriteria: {
      type: String,
      required: [true, "Resolution criteria is required"],
      trim: true,
    },
    resolvedOutcome: {
      type: String,
      enum: ["YES", "NO", null],
      default: null,
    },
    resolvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    // ─── Market Stats ──────────────────────────────────────────────
    yesStats: { type: OutcomeStatsSchema, default: () => ({}) },
    noStats: { type: OutcomeStatsSchema, default: () => ({}) },

    // ─── Price History (sampled every trade / minute) ──────────────
    priceHistory: {
      type: [PricePointSchema],
      default: [],
    },

    // ─── Meta ──────────────────────────────────────────────────────
    liquidity: { type: Number, default: 0 }, // Total cents locked in open orders
    totalVolumeCents: { type: Number, default: 0 },
    uniqueTraders: { type: Number, default: 0 },
    featured: { type: Boolean, default: false },
    slug: { type: String, unique: true, sparse: true },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ─── Indexes ──────────────────────────────────────────────────────────────────
MarketSchema.index({ status: 1, closesAt: 1 });
MarketSchema.index({ category: 1, status: 1 });
MarketSchema.index({ createdAt: -1 });
MarketSchema.index({ title: "text", description: "text", tags: "text" });

// ─── Virtuals ─────────────────────────────────────────────────────────────────
MarketSchema.virtual("isOpen").get(function () {
  return this.status === MARKET_STATUSES.OPEN && new Date() < this.closesAt;
});

MarketSchema.virtual("spread").get(function () {
  if (!this.yesStats.bestBid || !this.yesStats.bestAsk) return null;
  return this.yesStats.bestAsk - this.yesStats.bestBid;
});

// ─── Hooks ────────────────────────────────────────────────────────────────────
MarketSchema.pre("save", function (next) {
  if (!this.slug && this.title) {
    this.slug =
      this.title
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, "")
        .replace(/\s+/g, "-")
        .substring(0, 80) +
      "-" +
      Date.now().toString(36);
  }
  next();
});

// ─── Methods ──────────────────────────────────────────────────────────────────
MarketSchema.methods.addPricePoint = function (yesPrice, volume = 0) {
  this.priceHistory.push({ yesPrice, volume, timestamp: new Date() });
  // Keep last 2000 points (~30 days at 1pt/minute)
  if (this.priceHistory.length > 2000) {
    this.priceHistory.splice(0, this.priceHistory.length - 2000);
  }
};

module.exports = mongoose.model("Market", MarketSchema);