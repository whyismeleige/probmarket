// store/slices/marketSlice.ts
import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import { marketsApi } from "@/lib/api/markets.api";
import type { Market, MarketOrderBookSnapshot, PricePoint } from "@/types";

interface MarketState {
  markets: Market[];
  selectedMarket: Market | null;
  priceHistory: PricePoint[];
  isLoading: boolean;
  isLoadingMarket: boolean;
  error: string | null;
  pagination: { page: number; limit: number; total: number; pages: number } | null;
  // Live order book (updated via WebSocket)
  liveOrderBook: MarketOrderBookSnapshot | null;
}

const initialState: MarketState = {
  markets: [],
  selectedMarket: null,
  priceHistory: [],
  isLoading: false,
  isLoadingMarket: false,
  error: null,
  pagination: null,
  liveOrderBook: null,
};

export const fetchMarkets = createAsyncThunk(
  "market/fetchMarkets",
  async (params: Parameters<typeof marketsApi.list>[0], { rejectWithValue }) => {
    try {
      const res = await marketsApi.list(params);
      return res.data.data;
    } catch (err: unknown) {
      return rejectWithValue((err as Error).message);
    }
  }
);

export const fetchMarket = createAsyncThunk(
  "market/fetchMarket",
  async (id: string, { rejectWithValue }) => {
    try {
      const res = await marketsApi.getById(id);
      return res.data.data.market;
    } catch (err: unknown) {
      return rejectWithValue((err as Error).message);
    }
  }
);

export const fetchPriceHistory = createAsyncThunk(
  "market/fetchHistory",
  async ({ id, range }: { id: string; range: string }, { rejectWithValue }) => {
    try {
      const res = await marketsApi.getHistory(id, range);
      return res.data.data.history;
    } catch (err: unknown) {
      return rejectWithValue((err as Error).message);
    }
  }
);

const marketSlice = createSlice({
  name: "market",
  initialState,
  reducers: {
    setLiveOrderBook: (state, action: PayloadAction<MarketOrderBookSnapshot>) => {
      state.liveOrderBook = action.payload;
    },
    clearSelectedMarket: (state) => {
      state.selectedMarket = null;
      state.liveOrderBook = null;
      state.priceHistory = [];
    },
    updateMarketStats: (state, action: PayloadAction<{ marketId: string; yesPrice: number }>) => {
      const market = state.markets.find((m) => m._id === action.payload.marketId);
      if (market) {
        market.yesStats.lastPrice = action.payload.yesPrice;
        market.noStats.lastPrice = 100 - action.payload.yesPrice;
      }
    },
  },
  extraReducers: (builder) => {
    builder.addCase(fetchMarkets.pending, (state) => { state.isLoading = true; state.error = null; });
    builder.addCase(fetchMarkets.fulfilled, (state, action) => {
      state.isLoading = false;
      state.markets = action.payload.markets;
      state.pagination = action.payload.pagination;
    });
    builder.addCase(fetchMarkets.rejected, (state, action) => {
      state.isLoading = false;
      state.error = action.payload as string;
    });

    builder.addCase(fetchMarket.pending, (state) => { state.isLoadingMarket = true; state.error = null; });
    builder.addCase(fetchMarket.fulfilled, (state, action) => {
      state.isLoadingMarket = false;
      state.selectedMarket = action.payload;
      if (action.payload.orderBook) {
        state.liveOrderBook = action.payload.orderBook;
      }
    });
    builder.addCase(fetchMarket.rejected, (state, action) => {
      state.isLoadingMarket = false;
      state.error = action.payload as string;
    });

    builder.addCase(fetchPriceHistory.fulfilled, (state, action) => {
      state.priceHistory = action.payload;
    });
  },
});

export const { setLiveOrderBook, clearSelectedMarket, updateMarketStats } = marketSlice.actions;
export default marketSlice.reducer;