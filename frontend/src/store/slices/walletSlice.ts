// store/slices/walletSlice.ts
import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import { walletApi } from "@/lib/api/orders.api";
import type { Wallet } from "@/types";

interface WalletState {
  wallet: Wallet | null;
  isLoading: boolean;
  error: string | null;
}

const initialState: WalletState = {
  wallet: null,
  isLoading: false,
  error: null,
};

export const fetchWallet = createAsyncThunk(
  "wallet/fetch",
  async (_, { rejectWithValue }) => {
    try {
      const res = await walletApi.get();
      return res.data.data.wallet;
    } catch (err: unknown) {
      return rejectWithValue((err as Error).message);
    }
  }
);

const walletSlice = createSlice({
  name: "wallet",
  initialState,
  reducers: {
    // Live update from WebSocket settlement or trade credit
    updateBalance: (state, action: PayloadAction<Partial<Wallet>>) => {
      if (state.wallet) {
        state.wallet = { ...state.wallet, ...action.payload };
      }
    },
  },
  extraReducers: (builder) => {
    builder.addCase(fetchWallet.pending, (state) => { state.isLoading = true; });
    builder.addCase(fetchWallet.fulfilled, (state, action) => {
      state.isLoading = false;
      state.wallet = action.payload;
    });
    builder.addCase(fetchWallet.rejected, (state, action) => {
      state.isLoading = false;
      state.error = action.payload as string;
    });
  },
});

export const { updateBalance } = walletSlice.actions;
export default walletSlice.reducer;