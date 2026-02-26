// store/slices/orderSlice.ts
import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import { ordersApi } from "@/lib/api/orders.api";
import type { Order, Trade } from "@/types";

interface OrderState {
  orders: Order[];
  isPlacing: boolean;
  isCancelling: string | null; // orderId being cancelled
  lastFills: Trade[];
  error: string | null;
  pagination: { page: number; limit: number; total: number; pages: number } | null;
}

const initialState: OrderState = {
  orders: [],
  isPlacing: false,
  isCancelling: null,
  lastFills: [],
  error: null,
  pagination: null,
};

export const placeOrder = createAsyncThunk(
  "orders/place",
  async (
    data: Parameters<typeof ordersApi.place>[0],
    { rejectWithValue }
  ) => {
    try {
      const res = await ordersApi.place(data);
      return res.data.data;
    } catch (err: unknown) {
      return rejectWithValue((err as Error).message);
    }
  }
);

export const cancelOrder = createAsyncThunk(
  "orders/cancel",
  async (orderId: string, { rejectWithValue }) => {
    try {
      await ordersApi.cancel(orderId);
      return orderId;
    } catch (err: unknown) {
      return rejectWithValue((err as Error).message);
    }
  }
);

export const fetchMyOrders = createAsyncThunk(
  "orders/fetchMy",
  async (params: Parameters<typeof ordersApi.getMyOrders>[0], { rejectWithValue }) => {
    try {
      const res = await ordersApi.getMyOrders(params);
      return res.data.data;
    } catch (err: unknown) {
      return rejectWithValue((err as Error).message);
    }
  }
);

const orderSlice = createSlice({
  name: "orders",
  initialState,
  reducers: {
    clearError: (state) => { state.error = null; },
    clearLastFills: (state) => { state.lastFills = []; },
    updateOrderFromSocket: (state, action: PayloadAction<{ orderId: string; status: string }>) => {
      const order = state.orders.find((o) => o._id === action.payload.orderId);
      if (order) {
        order.status = action.payload.status as Order["status"];
      }
    },
  },
  extraReducers: (builder) => {
    builder.addCase(placeOrder.pending, (state) => { state.isPlacing = true; state.error = null; });
    builder.addCase(placeOrder.fulfilled, (state, action) => {
      state.isPlacing = false;
      state.lastFills = action.payload.fills;
      // Prepend new order if still open
      if (action.payload.order.status !== "FILLED") {
        state.orders.unshift(action.payload.order);
      }
    });
    builder.addCase(placeOrder.rejected, (state, action) => {
      state.isPlacing = false;
      state.error = action.payload as string;
    });

    builder.addCase(cancelOrder.pending, (state, action) => {
      state.isCancelling = action.meta.arg;
    });
    builder.addCase(cancelOrder.fulfilled, (state, action) => {
      state.isCancelling = null;
      state.orders = state.orders.filter((o) => o._id !== action.payload);
    });
    builder.addCase(cancelOrder.rejected, (state, action) => {
      state.isCancelling = null;
      state.error = action.payload as string;
    });

    builder.addCase(fetchMyOrders.fulfilled, (state, action) => {
      state.orders = action.payload.orders;
      state.pagination = action.payload.pagination;
    });
  },
});

export const { clearError, clearLastFills, updateOrderFromSocket } = orderSlice.actions;
export default orderSlice.reducer;