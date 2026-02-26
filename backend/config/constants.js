// config/constants.js
// Central configuration constants for ProbMarket

module.exports = {
  // ─── Order Book ──────────────────────────────────────────────────────────────
  ORDER_SIDES: Object.freeze({ BUY: "BUY", SELL: "SELL" }),
  ORDER_TYPES: Object.freeze({ LIMIT: "LIMIT", MARKET: "MARKET" }),
  ORDER_STATUSES: Object.freeze({
    OPEN: "OPEN",
    PARTIALLY_FILLED: "PARTIALLY_FILLED",
    FILLED: "FILLED",
    CANCELLED: "CANCELLED",
    REJECTED: "REJECTED",
  }),

  // ─── Market ───────────────────────────────────────────────────────────────────
  OUTCOMES: Object.freeze({ YES: "YES", NO: "NO" }),
  MARKET_STATUSES: Object.freeze({
    DRAFT: "DRAFT",
    OPEN: "OPEN",
    SUSPENDED: "SUSPENDED",
    RESOLVED: "RESOLVED",
    CANCELLED: "CANCELLED",
  }),
  MARKET_CATEGORIES: Object.freeze([
    "Politics",
    "Sports",
    "Finance",
    "Technology",
    "Science",
    "Entertainment",
    "Crypto",
    "World Events",
    "Other",
  ]),

  // ─── Pricing ──────────────────────────────────────────────────────────────────
  // All prices are integers in CENTS (1–99)
  // A price of 60 means 60¢ per share = 60% probability
  MIN_PRICE: 1,
  MAX_PRICE: 99,
  PAYOUT_PER_SHARE: 100, // Winner gets 100¢ per winning share

  // ─── Wallet ───────────────────────────────────────────────────────────────────
  INITIAL_WALLET_BALANCE: parseFloat(process.env.INITIAL_WALLET_BALANCE || "10000"),

  // ─── Redis Keys ──────────────────────────────────────────────────────────────
  REDIS_KEYS: {
    USER: (id) => `user:${id}`,
    ORDER_BOOK_BIDS: (marketId, outcome) => `ob:${marketId}:${outcome}:bids`,
    ORDER_BOOK_ASKS: (marketId, outcome) => `ob:${marketId}:${outcome}:asks`,
    MARKET_STATS: (marketId) => `market:stats:${marketId}`,
    USER_RATE_LIMIT: (userId) => `rl:order:${userId}`,
  },

  // ─── WebSocket Rooms ──────────────────────────────────────────────────────────
  WS_ROOMS: {
    MARKET: (marketId) => `market:${marketId}`,
    USER: (userId) => `user:${userId}`,
    GLOBAL_MARKETS: "global:markets",
  },

  // ─── WebSocket Events ─────────────────────────────────────────────────────────
  WS_EVENTS: {
    // Client → Server
    SUBSCRIBE_MARKET: "subscribe:market",
    UNSUBSCRIBE_MARKET: "unsubscribe:market",
    REGISTER_USER: "register:user",
    DEREGISTER_USER: "deregister:user",
    // Server → Client
    ORDERBOOK_UPDATE: "orderbook:update",
    TRADE_EXECUTED: "trade:executed",
    ORDER_UPDATE: "order:update",
    MARKET_UPDATE: "market:update",
    WALLET_UPDATE: "wallet:update",
  },

  // ─── Timeouts / Limits ───────────────────────────────────────────────────────
  MAX_ORDERS_PER_USER_PER_MARKET: parseInt(process.env.MAX_ORDERS_PER_USER_PER_MARKET || "50"),
  ORDERBOOK_DEPTH_LEVELS: 10, // How many price levels to return in snapshot
  ORDERBOOK_BROADCAST_INTERVAL: parseInt(process.env.ORDERBOOK_BROADCAST_INTERVAL || "500"),
};