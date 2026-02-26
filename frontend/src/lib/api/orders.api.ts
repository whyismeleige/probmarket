// lib/api/orders.api.ts
import apiClient from "./client";
import type { Order, Trade } from "@/types";

interface PlaceOrderPayload {
  marketId: string;
  outcome: "YES" | "NO";
  side: "BUY" | "SELL";
  type?: "LIMIT" | "MARKET";
  priceCents?: number;
  quantity: number;
}

export const ordersApi = {
  place: (data: PlaceOrderPayload) =>
    apiClient.post<{
      success: boolean;
      message: string;
      data: { order: Order; fills: Trade[] };
    }>("/orders", data),

  cancel: (orderId: string) =>
    apiClient.delete<{ success: boolean; message: string }>(`/orders/${orderId}`),

  getMyOrders: (params?: {
    status?: string;
    marketId?: string;
    outcome?: string;
    side?: string;
    page?: number;
    limit?: number;
  }) =>
    apiClient.get<{
      success: boolean;
      data: {
        orders: Order[];
        pagination: { page: number; limit: number; total: number; pages: number };
      };
    }>("/orders", { params }),

  getOrder: (orderId: string) =>
    apiClient.get<{
      success: boolean;
      data: { order: Order; fills: Trade[] };
    }>(`/orders/${orderId}`),

  getMarketOrders: (marketId: string) =>
    apiClient.get<{ success: boolean; data: { orders: Order[] } }>(
      `/orders/market/${marketId}`
    ),
};

// lib/api/wallet.api.ts
export const walletApi = {
  get: () =>
    apiClient.get<{
      success: boolean;
      data: {
        wallet: {
          availableBalanceCents: number;
          reservedBalanceCents: number;
          totalBalanceCents: number;
          availableBalance: string;
          reservedBalance: string;
          totalBalance: string;
        };
      };
    }>("/wallet"),

  getTransactions: (params?: { page?: number; limit?: number; type?: string }) =>
    apiClient.get<{
      success: boolean;
      data: {
        transactions: import("@/types").WalletTransaction[];
        pagination: { page: number; total: number };
      };
    }>("/wallet/transactions", { params }),
};

// lib/api/positions.api.ts
export const positionsApi = {
  getMyPositions: (params?: { settled?: boolean }) =>
    apiClient.get<{
      success: boolean;
      data: {
        positions: import("@/types").Position[];
        summary: import("@/types").PositionSummary;
      };
    }>("/positions", { params }),

  getMarketPosition: (marketId: string) =>
    apiClient.get<{
      success: boolean;
      data: { positions: import("@/types").Position[] };
    }>(`/positions/${marketId}`),

  getTradeHistory: (params?: { page?: number; limit?: number; marketId?: string }) =>
    apiClient.get<{
      success: boolean;
      data: {
        trades: import("@/types").Trade[];
        pagination: { page: number; limit: number; total: number };
      };
    }>("/positions/history", { params }),
};