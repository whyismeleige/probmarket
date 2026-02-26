// utils/metrics.js
// Prometheus metrics for ProbMarket

const client = require("prom-client");

// Enable default metrics (CPU, memory, event loop lag, etc.)
client.collectDefaultMetrics({ prefix: "probmarket_" });

// ─── Custom Metrics ──────────────────────────────────────────────────────────

// HTTP request duration histogram
const httpRequestDuration = new client.Histogram({
  name: "probmarket_http_request_duration_seconds",
  help: "Duration of HTTP requests in seconds",
  labelNames: ["method", "route", "status_code"],
  buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 2, 5],
});

// Orders placed counter
const ordersTotal = new client.Counter({
  name: "probmarket_orders_total",
  help: "Total number of orders placed",
  labelNames: ["type", "side", "outcome", "status"],
});

// Trades executed counter
const tradesTotal = new client.Counter({
  name: "probmarket_trades_total",
  help: "Total number of trades executed",
  labelNames: ["market_id"],
});

// Active WebSocket connections gauge
const activeWebSocketConnections = new client.Gauge({
  name: "probmarket_websocket_connections_active",
  help: "Number of active WebSocket connections",
});

// Order book depth gauge
const orderBookDepth = new client.Gauge({
  name: "probmarket_orderbook_depth",
  help: "Number of open orders in the order book",
  labelNames: ["market_id", "outcome", "side"],
});

// Matching engine latency histogram
const matchingEngineLatency = new client.Histogram({
  name: "probmarket_matching_engine_latency_ms",
  help: "Latency of the matching engine in milliseconds",
  buckets: [0.1, 0.5, 1, 2, 5, 10, 25, 50, 100],
});

// Active open markets gauge
const activeMarkets = new client.Gauge({
  name: "probmarket_active_markets",
  help: "Number of currently open prediction markets",
});

// Total trading volume
const tradingVolumeCents = new client.Counter({
  name: "probmarket_trading_volume_cents_total",
  help: "Total trading volume in cents",
  labelNames: ["market_id"],
});

module.exports = {
  client,
  httpRequestDuration,
  ordersTotal,
  tradesTotal,
  activeWebSocketConnections,
  orderBookDepth,
  matchingEngineLatency,
  activeMarkets,
  tradingVolumeCents,
};