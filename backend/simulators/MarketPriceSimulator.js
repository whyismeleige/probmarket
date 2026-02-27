// simulators/MarketPriceSimulator.js
// Generates simulated YES/NO probability ticks for every OPEN prediction market.
// Emits `market:price-tick` to each market's room every 5 seconds.
// Persists buffered price points to MongoDB's priceHistory every 60 seconds.

const logger = require("../utils/logger");
const { MARKET_STATUSES, WS_ROOMS } = require("../config/constants");

const TICK_INTERVAL_MS   = 5_000;  // emit every 5 s
const PERSIST_INTERVAL_MS = 60_000; // flush to DB every 60 s

class MarketPriceSimulator {
  constructor(io) {
    this.io = io;
    this.isRunning = false;

    // In-memory market state: Map<marketId, { yesPrice, noPrice }>
    this.markets = new Map();

    // Pending DB writes: Map<marketId, Array<{yesPrice, volume, timestamp}>>
    this.pendingUpdates = new Map();

    this._tickInterval = null;
    this._persistInterval = null;
    this._refreshInterval = null;
  }

  // ─── Init ─────────────────────────────────────────────────────────────────
  async init() {
    if (this.isRunning) {
      logger.warn("⚠️  MarketPriceSimulator already running — skipping init.");
      return;
    }

    try {
      await this._loadOpenMarkets();

      if (this.markets.size === 0) {
        logger.warn("⚠️  No open markets found. Run seed script first.");
      }

      this.start();
    } catch (err) {
      logger.error("❌ MarketPriceSimulator init error:", err.message);
    }
  }

  // ─── Load all OPEN markets into memory ───────────────────────────────────
  async _loadOpenMarkets() {
    const db = require("../models");
    const markets = await db.market
      .find({ status: MARKET_STATUSES.OPEN })
      .select("_id yesStats noStats")
      .lean();

    for (const m of markets) {
      const marketId = m._id.toString();
      if (!this.markets.has(marketId)) {
        this.markets.set(marketId, {
          yesPrice: m.yesStats?.lastPrice ?? this._randInitialPrice(),
        });
      }
    }

    logger.info(`📊 MarketPriceSimulator loaded ${this.markets.size} open markets`);
  }

  // ─── Start loops ─────────────────────────────────────────────────────────
  start() {
    this.isRunning = true;
    logger.info("🚀 MarketPriceSimulator engine started");

    // Fast tick — emit price updates every 5 s
    this._tickInterval = setInterval(() => this._tick(), TICK_INTERVAL_MS);

    // Slow flush — persist to MongoDB every 60 s
    this._persistInterval = setInterval(() => this._persistData(), PERSIST_INTERVAL_MS);

    // Refresh open market list every 2 minutes (picks up newly created markets)
    this._refreshInterval = setInterval(() => this._loadOpenMarkets(), 2 * 60_000);
  }

  // ─── Graceful stop ───────────────────────────────────────────────────────
  async stop() {
    clearInterval(this._tickInterval);
    clearInterval(this._persistInterval);
    clearInterval(this._refreshInterval);
    this.isRunning = false;
    await this._persistData();
    logger.info("🛑 MarketPriceSimulator stopped and flushed.");
  }

  // ─── Price tick ──────────────────────────────────────────────────────────
  _tick() {
    const now = Date.now();

    // Global event cycle — slow sine wave (period ~8 min) adds shared momentum
    const globalMomentum = Math.sin(now / 50_000) * 0.012;

    for (const [marketId, state] of this.markets.entries()) {
      const prev = state.yesPrice;

      // ── Random walk ±2 percentage points ─────────────────────────────────
      const randomWalk = (Math.random() - 0.5) * 0.04;

      // ── Mean-reversion toward 50 (prevents drift to extremes) ────────────
      const meanReversion = (50 - prev) * 0.008;

      // ── Bounded momentum from global cycle ───────────────────────────────
      let newPrice = prev + (randomWalk + meanReversion + globalMomentum) * prev * 0.1;

      // Hard clamp to 2–98 (prices can't be 0 or 100)
      newPrice = Math.max(2, Math.min(98, newPrice));
      newPrice = parseFloat(newPrice.toFixed(1));

      state.yesPrice = newPrice;

      const noPrice = parseFloat((100 - newPrice).toFixed(1));
      const timestamp = new Date().toISOString();

      // Emit to all sockets subscribed to this market's room
      this.io.to(WS_ROOMS.MARKET(marketId)).emit("market:price-tick", {
        marketId,
        yesPrice: newPrice,
        noPrice,
        timestamp,
      });

      // Buffer for DB persist
      if (!this.pendingUpdates.has(marketId)) {
        this.pendingUpdates.set(marketId, []);
      }
      this.pendingUpdates.get(marketId).push({
        yesPrice: newPrice,
        volume: 0, // Volume is set by actual trades; simulator contributes 0
        timestamp: new Date(),
      });
    }
  }

  // ─── Persist buffered data to MongoDB ────────────────────────────────────
  async _persistData() {
    if (this.pendingUpdates.size === 0) return;

    const db = require("../models");
    const bulkOps = [];

    for (const [marketId, points] of this.pendingUpdates.entries()) {
      const latest = points[points.length - 1];

      // Only keep every 6th point (= 1 point per 30 s → ~2880/day, manageable)
      const sampleEvery = 6;
      const sampled = points.filter((_, i) => i % sampleEvery === 0);
      if (sampled.length === 0) continue;

      bulkOps.push({
        updateOne: {
          filter: { _id: marketId },
          update: {
            $set: {
              "yesStats.lastPrice": latest.yesPrice,
              "noStats.lastPrice": parseFloat((100 - latest.yesPrice).toFixed(1)),
            },
            $push: {
              priceHistory: {
                $each: sampled,
                $slice: -2000, // Keep max 2000 points (~30 days at 1pt/30s)
              },
            },
          },
        },
      });
    }

    if (bulkOps.length === 0) {
      this.pendingUpdates.clear();
      return;
    }

    try {
      await db.market.bulkWrite(bulkOps, { ordered: false });
      this.pendingUpdates.clear();
      logger.debug(`💾 MarketPriceSimulator persisted data for ${bulkOps.length} markets`);
    } catch (err) {
      logger.error("❌ MarketPriceSimulator DB persist error:", err.message);
    }
  }

  // ─── Helpers ─────────────────────────────────────────────────────────────
  _randInitialPrice() {
    return Math.floor(Math.random() * 60) + 20; // 20–80
  }
}

module.exports = MarketPriceSimulator;