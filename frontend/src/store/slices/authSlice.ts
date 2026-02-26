// store/slices/authSlice.ts
import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import { authApi } from "@/lib/api/auth.api";
import type { User, AuthState } from "@/types";

const initialState: AuthState = {
  user: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,
};

export const login = createAsyncThunk(
  "auth/login",
  async (data: { email: string; password: string }, { rejectWithValue }) => {
    try {
      const res = await authApi.login(data);
      return res.data.data.user;
    } catch (err: unknown) {
      return rejectWithValue((err as Error).message);
    }
  }
);

export const register = createAsyncThunk(
  "auth/register",
  async (
    data: { username: string; email: string; password: string; displayName?: string },
    { rejectWithValue }
  ) => {
    try {
      const res = await authApi.register(data);
      return res.data.data.user;
    } catch (err: unknown) {
      return rejectWithValue((err as Error).message);
    }
  }
);

export const logout = createAsyncThunk("auth/logout", async (_, { rejectWithValue }) => {
  try {
    await authApi.logout();
  } catch (err: unknown) {
    return rejectWithValue((err as Error).message);
  }
});

export const fetchProfile = createAsyncThunk("auth/fetchProfile", async (_, { rejectWithValue }) => {
  try {
    const res = await authApi.getProfile();
    return res.data.data.user;
  } catch (err: unknown) {
    return rejectWithValue((err as Error).message);
  }
});

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    clearError: (state) => { state.error = null; },
    setUser: (state, action: PayloadAction<User>) => {
      state.user = action.payload;
      state.isAuthenticated = true;
    },
  },
  extraReducers: (builder) => {
    // login
    builder.addCase(login.pending, (state) => { state.isLoading = true; state.error = null; });
    builder.addCase(login.fulfilled, (state, action) => {
      state.isLoading = false;
      state.user = action.payload;
      state.isAuthenticated = true;
    });
    builder.addCase(login.rejected, (state, action) => {
      state.isLoading = false;
      state.error = action.payload as string;
    });

    // register
    builder.addCase(register.pending, (state) => { state.isLoading = true; state.error = null; });
    builder.addCase(register.fulfilled, (state, action) => {
      state.isLoading = false;
      state.user = action.payload;
      state.isAuthenticated = true;
    });
    builder.addCase(register.rejected, (state, action) => {
      state.isLoading = false;
      state.error = action.payload as string;
    });

    // logout
    builder.addCase(logout.fulfilled, (state) => {
      state.user = null;
      state.isAuthenticated = false;
    });

    // fetchProfile
    builder.addCase(fetchProfile.fulfilled, (state, action) => {
      state.user = action.payload;
      state.isAuthenticated = true;
    });
    builder.addCase(fetchProfile.rejected, (state) => {
      state.user = null;
      state.isAuthenticated = false;
    });
  },
});

export const { clearError, setUser } = authSlice.actions;
export default authSlice.reducer;