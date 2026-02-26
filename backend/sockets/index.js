// sockets/index.js
const { Server } = require("socket.io");
const { verifyToken } = require("../utils/auth.utils");
const { WS_EVENTS, WS_ROOMS } = require("../config/constants");
const { activeWebSocketConnections } = require("../utils/metrics");
const logger = require("../utils/logger");
const orderBookService = require("../services/orderBook.service");

const initializeSocket = (httpServer) => {
  const io = new Server(httpServer, {
    cors: {
      origin: (process.env.ALLOWED_ORIGINS || "http://localhost:3000").split(","),
      credentials: true,
    },
    pingTimeout: 60000,
    pingInterval: 25000,
    transports: ["websocket", "polling"],
  });

  // ─── Authentication middleware ─────────────────────────────────────────────
  io.use((socket, next) => {
    try {
      const token =
        socket.handshake.auth?.token ||
        socket.handshake.headers?.cookie
          ?.split(";")
          .find((c) => c.trim().startsWith("token="))
          ?.split("=")[1];

      if (!token) {
        socket.userId = null;
        return next();
      }

      const { id } = verifyToken(token);
      socket.userId = id;
      next();
    } catch {
      socket.userId = null;
      next();
    }
  });

  // ─── Connection handler ────────────────────────────────────────────────────
  io.on("connection", (socket) => {
    activeWebSocketConnections.inc();
    logger.info(`🔌 WebSocket connected: ${socket.id} (user: ${socket.userId || "anon"})`);

    // ── Register user room (for private updates) ───────────────────────────
    socket.on(WS_EVENTS.REGISTER_USER, (userId) => {
      if (socket.userId && socket.userId === userId) {
        socket.join(WS_ROOMS.USER(userId));
        logger.debug(`👤 User ${userId} joined private room`);
      }
    });

    socket.on(WS_EVENTS.DEREGISTER_USER, (userId) => {
      socket.leave(WS_ROOMS.USER(userId));
    });

    // ── Subscribe to a market's order book updates ─────────────────────────
    socket.on(WS_EVENTS.SUBSCRIBE_MARKET, async (marketId) => {
      if (!marketId) return;
      socket.join(WS_ROOMS.MARKET(marketId));
      logger.debug(`📊 ${socket.id} subscribed to market ${marketId}`);

      try {
        const snapshot = orderBookService.getMarketSnapshot(marketId);
        socket.emit(WS_EVENTS.ORDERBOOK_UPDATE, snapshot);
      } catch (err) {
        logger.error(`Error sending order book snapshot: ${err.message}`);
      }
    });

    socket.on(WS_EVENTS.UNSUBSCRIBE_MARKET, (marketId) => {
      socket.leave(WS_ROOMS.MARKET(marketId));
    });

    // ── Live Market Simulator room ─────────────────────────────────────────
    // Frontend joins "market-data" to receive real-time stock price updates.
    // No auth required — this is public broadcast data.
    socket.on("join-room", (room) => {
      if (room === "market-data") {
        socket.join("market-data");
        logger.debug(`📈 ${socket.id} joined market-data room`);
      }
    });

    socket.on("leave-room", (room) => {
      socket.leave(room);
    });

    // ── Disconnect ─────────────────────────────────────────────────────────
    socket.on("disconnect", (reason) => {
      activeWebSocketConnections.dec();
      logger.info(`🔌 WebSocket disconnected: ${socket.id} (reason: ${reason})`);
    });
  });

  return io;
};

module.exports = initializeSocket;