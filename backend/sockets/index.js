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
        // Allow unauthenticated connections for public data (order book, market data)
        socket.userId = null;
        return next();
      }

      const { id } = verifyToken(token);
      socket.userId = id;
      next();
    } catch {
      socket.userId = null;
      next(); // Still allow — just won't have user context
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

      // Send immediate snapshot
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

    // ── Subscribe to global market list updates ────────────────────────────
    socket.on("subscribe:global", () => {
      socket.join(WS_ROOMS.GLOBAL_MARKETS);
    });

    // ── Disconnect ─────────────────────────────────────────────────────────
    socket.on("disconnect", (reason) => {
      activeWebSocketConnections.dec();
      logger.debug(`🔌 WebSocket disconnected: ${socket.id} (${reason})`);
    });
  });

  // ─── Start order book broadcast loop ──────────────────────────────────────
  // Every 500ms, broadcast updated order book snapshots to subscribed clients
  const BROADCAST_INTERVAL = parseInt(process.env.ORDERBOOK_BROADCAST_INTERVAL || "500");
  setInterval(() => {
    // For each market room with connected clients, broadcast the snapshot
    const rooms = io.sockets.adapter.rooms;
    for (const [roomName, clients] of rooms) {
      if (roomName.startsWith("market:") && clients.size > 0) {
        const marketId = roomName.replace("market:", "");
        try {
          const snapshot = orderBookService.getMarketSnapshot(marketId);
          io.to(roomName).emit(WS_EVENTS.ORDERBOOK_UPDATE, snapshot);
        } catch {
          // Market book may not exist
        }
      }
    }
  }, BROADCAST_INTERVAL);

  return io;
};

module.exports = initializeSocket;