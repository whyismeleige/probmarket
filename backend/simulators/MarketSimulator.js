// simulators/MarketSimulator.js
// Real-time stock price simulator that emits `market-update` events
// every 2 seconds to all sockets in the "market-data" room.
// Prices are persisted to MongoDB every 60 seconds via bulk write.

const logger = require("../utils/logger");

class MarketSimulator {
  constructor(io) {
    this.io = io;
    this.isRunning = false;
    this.stocks = []; // In-memory stock state

    // ⚡ BUFFER: Accumulate price points here; flush to DB every 60s
    this.pendingUpdates = new Map();

    // Track intervals so we can clear them on shutdown
    this._tickInterval = null;
    this._persistInterval = null;
  }

  // ─── Initialization ──────────────────────────────────────────────────────
  async init() {
    if (this.isRunning) {
      logger.warn("⚠️  MarketSimulator already running — skipping init.");
      return;
    }

    try {
      // Lazy-require to avoid circular dependency issues at module load time
      const db = require("../models");
      this.stocks = await db.stock.find({ isActive: true }).lean();

      if (this.stocks.length === 0) {
        logger.warn("⚠️  No active stocks found. Run `npm run seed:stocks` first.");
        return;
      }

      // Convert lean docs to mutable objects with _id kept as string
      this.stocks = this.stocks.map((s) => ({ ...s, _id: s._id.toString() }));

      logger.info(`📈 MarketSimulator loaded ${this.stocks.length} stocks into memory`);
      this.start();
    } catch (err) {
      logger.error("❌ MarketSimulator init error:", err.message);
    }
  }

  // ─── Start loops ─────────────────────────────────────────────────────────
  start() {
    this.isRunning = true;
    logger.info("🚀 MarketSimulator engine started");

    // Fast loop — emit prices every 2 seconds
    this._tickInterval = setInterval(() => this._tick(), 2000);

    // Slow loop — persist buffered data to MongoDB every 60 seconds
    this._persistInterval = setInterval(() => this._persistData(), 60_000);
  }

  // ─── Graceful stop ───────────────────────────────────────────────────────
  async stop() {
    clearInterval(this._tickInterval);
    clearInterval(this._persistInterval);
    this.isRunning = false;
    await this._persistData(); // final flush
    logger.info("🛑 MarketSimulator stopped and flushed.");
  }

  // ─── Price tick ──────────────────────────────────────────────────────────
  _tick() {
    const now = Date.now();
    const updates = [];

    // ── 1. Global market cycle (sine-wave Bull/Bear, period ~5 min) ──────
    const marketCycle = Math.sin(now / 40_000);
    const chaosFactor = (Math.random() - 0.5) * 0.5;
    const globalTrend = marketCycle * 0.2 + chaosFactor;

    this.stocks.forEach((stock) => {
      // ── 2. Individual random walk  ±1.5% ────────────────────────────────
      const randomWalk = (Math.random() - 0.5) * 0.03;

      // ── 3. Mean-reversion gravity ────────────────────────────────────────
      let gravity = 0;
      if (stock.currentPrice > stock.previousClosePrice * 2.5) gravity = -0.008;
      if (stock.currentPrice < stock.previousClosePrice * 0.4) gravity = 0.008;
      if (stock.currentPrice > 1000) gravity = Math.min(gravity - 0.012, -0.012);
      if (stock.currentPrice < 10)   gravity = Math.max(gravity + 0.012,  0.012);

      // ── 4. Final price change ─────────────────────────────────────────────
      const changePercent = globalTrend * 0.02 + randomWalk + gravity;
      let newPrice = stock.currentPrice * (1 + changePercent);

      // Hard floor
      if (newPrice < 1.0) newPrice = 1.0;

      stock.currentPrice = parseFloat(newPrice.toFixed(2));

      const previousClose = stock.previousClosePrice ?? stock.currentPrice;
      const change = parseFloat((stock.currentPrice - previousClose).toFixed(2));

      // ── 5. Build socket payload ───────────────────────────────────────────
      updates.push({
        _id: stock._id,
        symbol: stock.symbol,
        price: stock.currentPrice,
        change,
        timestamp: new Date().toISOString(),
      });

      // ── 6. Buffer for DB persist ──────────────────────────────────────────
      if (!this.pendingUpdates.has(stock._id)) {
        this.pendingUpdates.set(stock._id, []);
      }
      this.pendingUpdates.get(stock._id).push({
        price: stock.currentPrice,
        timestamp: new Date(),
      });
    });

    // Emit to everyone in the market-data room
    this.io.to("market-data").emit("market-update", updates);
  }

  // ─── DB persist ──────────────────────────────────────────────────────────
  async _persistData() {
    if (this.pendingUpdates.size === 0) return;

    const db = require("../models");
    const bulkOps = [];

    for (const [stockId, newPoints] of this.pendingUpdates.entries()) {
      const latestPrice = newPoints[newPoints.length - 1].price;
      bulkOps.push({
        updateOne: {
          filter: { _id: stockId },
          update: {
            $set: { currentPrice: latestPrice },
            $push: {
              history: {
                $each: newPoints,
                $slice: -500, // Keep history manageable
              },
            },
          },
        },
      });
    }

    try {
      await db.stock.bulkWrite(bulkOps, { ordered: false });
      this.pendingUpdates.clear();
      logger.debug(`💾 Persisted market data for ${bulkOps.length} stocks`);
    } catch (err) {
      logger.error("❌ MarketSimulator DB persist error:", err.message);
    }
  }
}

module.exports = MarketSimulator;