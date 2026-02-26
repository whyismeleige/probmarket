// server.js — ProbMarket Backend Entry Point
require("dotenv").config();

const express = require("express");
const { createServer } = require("node:http");
const cookieParser = require("cookie-parser");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");

const connectDB = require("./database/mongoDB");
const redisClient = require("./database/redis");
const initializeSocket = require("./sockets");
const initScheduledJobs = require("./jobs/marketScheduler");
const errorHandler = require("./middleware/errorHandler");
const { generalLimiter } = require("./middleware/rateLimiter.middleware");
const { client: promClient, httpRequestDuration, activeMarkets } = require("./utils/metrics");
const orderBookService = require("./services/orderBook.service");
const logger = require("./utils/logger");
const db = require("./models");

const app = express();
const server = createServer(app);
const PORT = process.env.PORT || 8080;

// ─── Security & Parsing Middleware ────────────────────────────────────────────
app.use(
  helmet({
    crossOriginEmbedderPolicy: false,
    contentSecurityPolicy: false,
  })
);

const allowedOrigins = (process.env.ALLOWED_ORIGINS || "http://localhost:3000").split(",");
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
      callback(new Error(`CORS blocked: ${origin}`));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  })
);

app.use(express.json({ limit: "10kb" }));
app.use(express.urlencoded({ extended: true, limit: "10kb" }));
app.use(cookieParser());

// ─── Logging ──────────────────────────────────────────────────────────────────
if (process.env.NODE_ENV !== "test") {
  app.use(
    morgan("combined", {
      stream: { write: (msg) => logger.info(msg.trim()) },
      skip: (req) => req.path === "/health" || req.path === "/metrics",
    })
  );
}

// ─── Prometheus request duration middleware ───────────────────────────────────
app.use((req, res, next) => {
  const end = httpRequestDuration.startTimer({ method: req.method, route: req.path });
  res.on("finish", () => end({ status_code: res.statusCode }));
  next();
});

// ─── Rate Limiting ────────────────────────────────────────────────────────────
app.use(generalLimiter);

// ─── Socket.IO ────────────────────────────────────────────────────────────────
const io = initializeSocket(server);
app.set("io", io);

// ─── Routes ───────────────────────────────────────────────────────────────────
app.use("/api/auth",      require("./routes/auth.routes"));
app.use("/api/markets",   require("./routes/market.routes"));
app.use("/api/orders",    require("./routes/order.routes"));
app.use("/api/wallet",    require("./routes/wallet.routes"));
app.use("/api/positions", require("./routes/position.routes"));

// ─── Health Check ─────────────────────────────────────────────────────────────
app.get("/health", async (req, res) => {
  const mongoStatus = db.mongoose.connection.readyState === 1 ? "up" : "down";
  let redisStatus = "down";
  try {
    await redisClient.ping();
    redisStatus = "up";
  } catch {}

  const status = mongoStatus === "up" && redisStatus === "up" ? "healthy" : "degraded";
  res.status(status === "healthy" ? 200 : 503).json({
    status,
    timestamp: new Date().toISOString(),
    services: { mongodb: mongoStatus, redis: redisStatus },
    uptime: process.uptime(),
    version: "1.0.0",
  });
});

// ─── Prometheus Metrics Endpoint ──────────────────────────────────────────────
if (process.env.METRICS_ENABLED !== "false") {
  app.get("/metrics", async (req, res) => {
    res.set("Content-Type", promClient.register.contentType);
    res.end(await promClient.register.metrics());
  });
}

// ─── 404 Handler ──────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ success: false, message: `Route not found: ${req.originalUrl}` });
});

// ─── Global Error Handler ─────────────────────────────────────────────────────
app.use(errorHandler);

// ─── Server Startup ───────────────────────────────────────────────────────────
const startServer = async () => {
  try {
    // 1. Connect to MongoDB
    await connectDB();

    // 2. Connect to Redis
    await redisClient.connect();
    logger.info("✅ Redis connected");

    // 3. Load all open markets into order book service
    const openMarkets = await db.market.find({
      status: { $in: ["OPEN", "SUSPENDED"] },
    }).select("_id title");

    logger.info(`📚 Initializing order books for ${openMarkets.length} markets`);
    await Promise.all(openMarkets.map((m) => orderBookService.initMarket(m._id)));

    // Set active markets metric
    activeMarkets.set(openMarkets.filter((m) => m.status === "OPEN").length);

    // 4. Start order book persistence loop
    orderBookService.startPersistLoop(5000);

    // 5. Start scheduled jobs
    initScheduledJobs();

    // 6. Start listening
    server.listen(PORT, () => {
      logger.info(`🚀 ProbMarket backend running on port ${PORT} [${process.env.NODE_ENV || "development"}]`);
      logger.info(`📊 Metrics: http://localhost:${PORT}/metrics`);
      logger.info(`💚 Health:  http://localhost:${PORT}/health`);
    });
  } catch (err) {
    logger.error("❌ Server startup failed:", err);
    process.exit(1);
  }
};

// ─── Graceful Shutdown ────────────────────────────────────────────────────────
const shutdown = async (signal) => {
  logger.info(`\n${signal} received — shutting down gracefully...`);
  await orderBookService.persistAll(); // Final persist before exit
  server.close(async () => {
    await db.mongoose.connection.close();
    await redisClient.quit();
    logger.info("✅ Graceful shutdown complete");
    process.exit(0);
  });
  setTimeout(() => { process.exit(1); }, 10000); // Force kill after 10s
};

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
process.on("unhandledRejection", (err) => logger.error("Unhandled rejection:", err));
process.on("uncaughtException", (err) => {
  logger.error("Uncaught exception:", err);
  shutdown("UNCAUGHT_EXCEPTION");
});

startServer();
module.exports = { app, server };