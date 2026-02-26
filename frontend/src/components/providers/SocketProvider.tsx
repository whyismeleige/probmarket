"use client";
// components/providers/SocketProvider.tsx
import { createContext, useContext, useEffect, useRef, ReactNode } from "react";
import { Socket } from "socket.io-client";
import { getSocket, socketEvents } from "@/lib/socket";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { setLiveOrderBook } from "@/store/slices/marketSlice";
import { fetchWallet } from "@/store/slices/walletSlice";
import { updateOrderFromSocket } from "@/store/slices/orderSlice";
import { applyMarketUpdate, setConnected, StockUpdate } from "@/store/slices/stockSlice";
import type { MarketOrderBookSnapshot } from "@/types";
import toast from "react-hot-toast";

interface SocketContextValue {
  socket: Socket | null;
  subscribeMarket: (marketId: string) => void;
  unsubscribeMarket: (marketId: string) => void;
}

const SocketContext = createContext<SocketContextValue>({
  socket: null,
  subscribeMarket: () => {},
  unsubscribeMarket: () => {},
});

export const useSocket = () => useContext(SocketContext);

export function SocketProvider({ children }: { children: ReactNode }) {
  const dispatch = useAppDispatch();
  const { user, isAuthenticated } = useAppSelector((s) => s.auth);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    const socket = getSocket();
    socketRef.current = socket;

    // Track connection status
    socket.on("connect", () => {
      dispatch(setConnected(true));
      // Join the market-data room for the stock simulator
      socket.emit("join-room", "market-data");
    });

    socket.on("disconnect", () => {
      dispatch(setConnected(false));
    });

    // ── Stock Market Simulator ─────────────────────────────────────────────
    socket.on("market-update", (updates: StockUpdate[]) => {
      dispatch(applyMarketUpdate(updates));
    });

    // ── Order book updates ─────────────────────────────────────────────────
    socket.on(socketEvents.ORDERBOOK_UPDATE, (snapshot: MarketOrderBookSnapshot) => {
      dispatch(setLiveOrderBook(snapshot));
    });

    // ── Trade executed notification ───────────────────────────────────────
    socket.on(socketEvents.TRADE_EXECUTED, (_fill: { outcome: string; priceCents: number; quantity: number }) => {
      dispatch(fetchWallet());
    });

    // ── Order status update ────────────────────────────────────────────────
    socket.on(socketEvents.ORDER_UPDATE, (data: { orderId: string; status: string; fills?: unknown[] }) => {
      if (data.status) {
        dispatch(updateOrderFromSocket({ orderId: data.orderId, status: data.status }));
      }
      if (data.fills && data.fills.length > 0) {
        dispatch(fetchWallet());
      }
    });

    // ── Wallet update (settlement) ─────────────────────────────────────────
    socket.on(socketEvents.WALLET_UPDATE, (data: { type: string; payoutCents: number; outcome: string }) => {
      dispatch(fetchWallet());
      if (data.type === "SETTLEMENT_CREDIT") {
        toast.success(
          `🏆 Market settled! You received $${(data.payoutCents / 100).toFixed(2)} for your ${data.outcome} shares.`,
          { duration: 8000 }
        );
      }
    });

    // If already connected, join room immediately
    if (socket.connected) {
      dispatch(setConnected(true));
      socket.emit("join-room", "market-data");
    }

    return () => {
      socket.off("connect");
      socket.off("disconnect");
      socket.off("market-update");
      socket.off(socketEvents.ORDERBOOK_UPDATE);
      socket.off(socketEvents.TRADE_EXECUTED);
      socket.off(socketEvents.ORDER_UPDATE);
      socket.off(socketEvents.WALLET_UPDATE);
    };
  }, [dispatch]);

  // Register user room when authenticated
  useEffect(() => {
    const socket = socketRef.current;
    if (!socket) return;
    if (isAuthenticated && user) {
      socket.emit(socketEvents.REGISTER_USER, user._id);
    } else {
      if (user) socket.emit(socketEvents.DEREGISTER_USER, user._id);
    }
  }, [isAuthenticated, user]);

  const subscribeMarket = (marketId: string) => {
    socketRef.current?.emit(socketEvents.SUBSCRIBE_MARKET, marketId);
  };

  const unsubscribeMarket = (marketId: string) => {
    socketRef.current?.emit(socketEvents.UNSUBSCRIBE_MARKET, marketId);
  };

  return (
    <SocketContext.Provider value={{ socket: socketRef.current, subscribeMarket, unsubscribeMarket }}>
      {children}
    </SocketContext.Provider>
  );
}