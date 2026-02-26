// lib/socket.ts
import { io, Socket } from "socket.io-client";

const SOCKET_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

let socket: Socket | null = null;

export const getSocket = (): Socket => {
  if (!socket || !socket.connected) {
    socket = io(SOCKET_URL, {
      withCredentials: true,
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });

    socket.on("connect", () => {
      console.log("🔌 Socket connected:", socket!.id);
    });
    socket.on("disconnect", (reason) => {
      console.warn("⚠️ Socket disconnected:", reason);
    });
    socket.on("connect_error", (err) => {
      console.error("Socket connection error:", err.message);
    });
  }
  return socket;
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};

// Typed event helpers
export const socketEvents = {
  SUBSCRIBE_MARKET: "subscribe:market",
  UNSUBSCRIBE_MARKET: "unsubscribe:market",
  REGISTER_USER: "register:user",
  DEREGISTER_USER: "deregister:user",

  ORDERBOOK_UPDATE: "orderbook:update",
  TRADE_EXECUTED: "trade:executed",
  ORDER_UPDATE: "order:update",
  MARKET_UPDATE: "market:update",
  WALLET_UPDATE: "wallet:update",
} as const;