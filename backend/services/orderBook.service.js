// services/orderBook.service.js
//
// Central Limit Order Book (CLOB) — In-Memory with Redis Persistence
//
// Architecture:
//   - Each market has TWO order books: one for YES outcome, one for NO outcome
//   - Each book has: bids (BUY orders) sorted DESC by price, then ASC by time
//                    asks (SELL orders) sorted ASC by price, then ASC by time
//   - The books live in memory (Map) for ultra-low-latency reads
//   - On any mutation, books are serialized to Redis for crash recovery
//   - On server start, books are restored from Redis (or rebuilt from DB)
//
// Price-Time Priority:
//   - Best BID = highest price. Ties broken by earliest createdAt.
//   - Best ASK = lowest price. Ties broken by earliest createdAt.

const redisClient = require("../database/redis");
const { REDIS_KEYS, ORDER_SIDES, ORDERBOOK_DEPTH_LEVELS } = require("../config/constants");
const logger = require("../utils/logger");

class OrderBookEntry {
  constructor({ orderId, userId, priceCents, quantity, remainingQuantity, createdAt }) {
    this.orderId = orderId.toString();
    this.userId = userId.toString();
    this.priceCents = priceCents;
    this.quantity = quantity;
    this.remainingQuantity = remainingQuantity;
    this.createdAt = createdAt instanceof Date ? createdAt.getTime() : createdAt;
  }
}

class HalfBook {
  /**
   * @param {string} side - "BUY" | "SELL"
   */
  constructor(side) {
    this.side = side;
    // Map: orderId → OrderBookEntry
    this.entries = new Map();
    // Price levels: Map<priceCents, OrderBookEntry[]> (sorted by time)
    this.levels = new Map();
  }

  /**
   * Insert an order into the half-book.
   */
  add(entry) {
    this.entries.set(entry.orderId, entry);
    if (!this.levels.has(entry.priceCents)) {
      this.levels.set(entry.priceCents, []);
    }
    this.levels.get(entry.priceCents).push(entry);
  }

  /**
   * Remove an order from the half-book (cancel or filled).
   */
  remove(orderId) {
    const entry = this.entries.get(orderId);
    if (!entry) return false;

    this.entries.delete(orderId);

    const level = this.levels.get(entry.priceCents);
    if (level) {
      const idx = level.findIndex((e) => e.orderId === orderId);
      if (idx !== -1) level.splice(idx, 1);
      if (level.length === 0) this.levels.delete(entry.priceCents);
    }
    return true;
  }

  /**
   * Update the remaining quantity of an order (partial fill).
   */
  updateQuantity(orderId, newRemaining) {
    const entry = this.entries.get(orderId);
    if (entry) entry.remainingQuantity = newRemaining;
  }

  /**
   * Get the best price in this half-book.
   * BUY side → highest price; SELL side → lowest price.
   */
  getBestPrice() {
    if (this.levels.size === 0) return null;
    const prices = Array.from(this.levels.keys());
    return this.side === ORDER_SIDES.BUY
      ? Math.max(...prices)
      : Math.min(...prices);
  }

  /**
   * Get the best order (first at best price).
   */
  getBestOrder() {
    const bestPrice = this.getBestPrice();
    if (bestPrice === null) return null;
    const level = this.levels.get(bestPrice);
    // Sort by createdAt within the level (price-time priority)
    const sorted = level.slice().sort((a, b) => a.createdAt - b.createdAt);
    return sorted[0] || null;
  }

  /**
   * Get sorted price levels for depth snapshot.
   * Returns array of { priceCents, totalQuantity, orderCount }
   */
  getDepth(numLevels = ORDERBOOK_DEPTH_LEVELS) {
    const prices = Array.from(this.levels.keys());
    const sorted =
      this.side === ORDER_SIDES.BUY
        ? prices.sort((a, b) => b - a)  // DESC for bids
        : prices.sort((a, b) => a - b); // ASC for asks

    return sorted.slice(0, numLevels).map((priceCents) => {
      const level = this.levels.get(priceCents);
      const totalQuantity = level.reduce((s, e) => s + e.remainingQuantity, 0);
      return { priceCents, totalQuantity, orderCount: level.length };
    });
  }

  /**
   * Serialize to a plain array for Redis storage.
   */
  toArray() {
    return Array.from(this.entries.values()).map((e) => ({ ...e }));
  }

  /**
   * Rebuild from plain array (after Redis restore).
   */
  static fromArray(side, arr) {
    const book = new HalfBook(side);
    arr.forEach((e) => book.add(new OrderBookEntry(e)));
    return book;
  }

  get size() {
    return this.entries.size;
  }
}

class MarketOrderBook {
  /**
   * @param {string} marketId
   * @param {string} outcome  - "YES" | "NO"
   */
  constructor(marketId, outcome) {
    this.marketId = marketId.toString();
    this.outcome = outcome;
    this.bids = new HalfBook(ORDER_SIDES.BUY);
    this.asks = new HalfBook(ORDER_SIDES.SELL);
    this.lastTradePriceCents = null;
    this._dirty = false;
  }

  addOrder(orderEntry) {
    if (orderEntry.side === ORDER_SIDES.BUY) {
      this.bids.add(new OrderBookEntry(orderEntry));
    } else {
      this.asks.add(new OrderBookEntry(orderEntry));
    }
    this._dirty = true;
  }

  removeOrder(orderId, side) {
    let removed;
    if (side === ORDER_SIDES.BUY) {
      removed = this.bids.remove(orderId);
    } else {
      removed = this.asks.remove(orderId);
    }
    if (removed) this._dirty = true;
    return removed;
  }

  updateOrderQuantity(orderId, side, newRemaining) {
    if (side === ORDER_SIDES.BUY) {
      this.bids.updateQuantity(orderId, newRemaining);
    } else {
      this.asks.updateQuantity(orderId, newRemaining);
    }
    this._dirty = true;
  }

  getBestBid() {
    return this.bids.getBestPrice();
  }

  getBestAsk() {
    return this.asks.getBestPrice();
  }

  getSpread() {
    const bid = this.getBestBid();
    const ask = this.getBestAsk();
    if (bid === null || ask === null) return null;
    return ask - bid;
  }

  /**
   * Returns a depth snapshot for the UI order book display.
   */
  getSnapshot(depth = ORDERBOOK_DEPTH_LEVELS) {
    return {
      marketId: this.marketId,
      outcome: this.outcome,
      bids: this.bids.getDepth(depth),
      asks: this.asks.getDepth(depth),
      bestBid: this.getBestBid(),
      bestAsk: this.getBestAsk(),
      spread: this.getSpread(),
      lastTradePriceCents: this.lastTradePriceCents,
      timestamp: Date.now(),
    };
  }

  serialize() {
    return {
      bids: this.bids.toArray(),
      asks: this.asks.toArray(),
      lastTradePriceCents: this.lastTradePriceCents,
    };
  }

  static deserialize(marketId, outcome, data) {
    const book = new MarketOrderBook(marketId, outcome);
    book.bids = HalfBook.fromArray(ORDER_SIDES.BUY, data.bids || []);
    book.asks = HalfBook.fromArray(ORDER_SIDES.SELL, data.asks || []);
    book.lastTradePriceCents = data.lastTradePriceCents || null;
    return book;
  }
}

// ─── OrderBookService (Singleton) ─────────────────────────────────────────────

class OrderBookService {
  constructor() {
    // Map: `${marketId}:${outcome}` → MarketOrderBook
    this._books = new Map();
    this._persistTimer = null;
  }

  _key(marketId, outcome) {
    return `${marketId.toString()}:${outcome}`;
  }

  /**
   * Get or create an order book for a market/outcome.
   */
  getBook(marketId, outcome) {
    const key = this._key(marketId, outcome);
    if (!this._books.has(key)) {
      this._books.set(key, new MarketOrderBook(marketId, outcome));
    }
    return this._books.get(key);
  }

  /**
   * Initialize a market's order books (restore from Redis or fresh).
   */
  async initMarket(marketId) {
    for (const outcome of ["YES", "NO"]) {
      const redisKey = REDIS_KEYS.ORDER_BOOK_BIDS(marketId, outcome);
      try {
        const raw = await redisClient.get(redisKey);
        if (raw) {
          const data = JSON.parse(raw);
          const book = MarketOrderBook.deserialize(marketId, outcome, data);
          this._books.set(this._key(marketId, outcome), book);
          logger.info(`📚 Restored order book: ${marketId}:${outcome} (${book.bids.size} bids, ${book.asks.size} asks)`);
        } else {
          // Fresh empty book
          this.getBook(marketId, outcome);
          logger.info(`📚 Created empty order book: ${marketId}:${outcome}`);
        }
      } catch (err) {
        logger.error(`Failed to restore order book ${marketId}:${outcome}: ${err.message}`);
        this.getBook(marketId, outcome);
      }
    }
  }

  /**
   * Persist all dirty order books to Redis.
   */
  async persistAll() {
    const promises = [];
    for (const [key, book] of this._books) {
      if (!book._dirty) continue;
      const [marketId, outcome] = key.split(":");
      const redisKey = REDIS_KEYS.ORDER_BOOK_BIDS(marketId, outcome);
      const data = JSON.stringify(book.serialize());
      promises.push(
        redisClient.set(redisKey, data, "EX", 86400 * 7) // 7 day TTL
          .then(() => { book._dirty = false; })
          .catch((err) => logger.error(`Redis persist error ${key}: ${err.message}`))
      );
    }
    await Promise.all(promises);
  }

  /**
   * Start background persistence loop.
   */
  startPersistLoop(intervalMs = 5000) {
    this._persistTimer = setInterval(() => this.persistAll(), intervalMs);
    logger.info(`💾 Order book persistence loop started (${intervalMs}ms interval)`);
  }

  /**
   * Remove a market's order books from memory (after resolution).
   */
  async removeMarket(marketId) {
    for (const outcome of ["YES", "NO"]) {
      const key = this._key(marketId, outcome);
      this._books.delete(key);
      await redisClient.del(REDIS_KEYS.ORDER_BOOK_BIDS(marketId, outcome));
    }
  }

  /**
   * Get a combined snapshot for both outcomes of a market.
   */
  getMarketSnapshot(marketId) {
    return {
      YES: this.getBook(marketId, "YES").getSnapshot(),
      NO: this.getBook(marketId, "NO").getSnapshot(),
    };
  }
}

// Export singleton
module.exports = new OrderBookService();