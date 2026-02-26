// store/slices/stockSlice.ts
import { createSlice, PayloadAction } from "@reduxjs/toolkit";

export interface StockUpdate {
  _id: string;
  symbol: string;
  price: number;
  change: number;
  timestamp: string;
}

export interface StockState {
  symbol: string;
  price: number;
  change: number;
  prevPrice: number;
  history: number[]; // sparkline data
  flash: "up" | "down" | null;
  timestamp: string;
}

interface StocksState {
  stocks: Record<string, StockState>;
  isConnected: boolean;
}

const initialState: StocksState = {
  stocks: {},
  isConnected: false,
};

const stocksSlice = createSlice({
  name: "stocks",
  initialState,
  reducers: {
    setConnected(state, action: PayloadAction<boolean>) {
      state.isConnected = action.payload;
    },
    applyMarketUpdate(state, action: PayloadAction<StockUpdate[]>) {
      action.payload.forEach((update) => {
        const existing = state.stocks[update.symbol];
        const prevPrice = existing?.price ?? update.price;
        const flash: "up" | "down" | null =
          update.price > prevPrice ? "up" : update.price < prevPrice ? "down" : null;

        // Keep last 30 price points for sparkline
        const history = existing?.history ?? [];
        const newHistory = [...history, update.price].slice(-30);

        state.stocks[update.symbol] = {
          symbol: update.symbol,
          price: update.price,
          change: update.change,
          prevPrice,
          history: newHistory,
          flash,
          timestamp: update.timestamp,
        };
      });
    },
    clearFlash(state, action: PayloadAction<string>) {
      if (state.stocks[action.payload]) {
        state.stocks[action.payload].flash = null;
      }
    },
  },
});

export const { setConnected, applyMarketUpdate, clearFlash } = stocksSlice.actions;
export default stocksSlice.reducer;