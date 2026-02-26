// lib/api/markets.api.ts
import apiClient from "./client";
import type { Market, MarketOrderBookSnapshot, PricePoint, Trade } from "@/types";

interface ListMarketsParams {
  status?: string;
  category?: string;
  search?: string;
  featured?: boolean;
  page?: number;
  limit?: number;
  sort?: string;
  order?: "asc" | "desc";
}

export const marketsApi = {
  list: (params?: ListMarketsParams) =>
    apiClient.get<{
      success: boolean;
      data: {
        markets: Market[];
        pagination: { page: number; limit: number; total: number; pages: number };
      };
    }>("/markets", { params }),

  getById: (id: string) =>
    apiClient.get<{ success: boolean; data: { market: Market } }>(`/markets/${id}`),

  getHistory: (id: string, range?: string) =>
    apiClient.get<{ success: boolean; data: { history: PricePoint[] } }>(
      `/markets/${id}/history`,
      { params: { range } }
    ),

  getOrderBook: (id: string, depth?: number) =>
    apiClient.get<{ success: boolean; data: { orderBook: MarketOrderBookSnapshot } }>(
      `/markets/${id}/orderbook`,
      { params: { depth } }
    ),

  getTrades: (id: string, params?: { page?: number; limit?: number }) =>
    apiClient.get<{
      success: boolean;
      data: { trades: Trade[]; pagination: { page: number; total: number } };
    }>(`/markets/${id}/trades`, { params }),

  getCategories: () =>
    apiClient.get<{
      success: boolean;
      data: { categories: { _id: string; count: number }[] };
    }>("/markets/categories"),
};