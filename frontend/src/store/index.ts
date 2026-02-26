// store/index.ts
import { configureStore, combineReducers } from "@reduxjs/toolkit";
import {
  persistStore,
  persistReducer,
  FLUSH,
  REHYDRATE,
  PAUSE,
  PERSIST,
  PURGE,
  REGISTER,
} from "redux-persist";
import storage from "redux-persist/lib/storage";
import sessionStorage from "redux-persist/lib/storage/session";
import authReducer from "./slices/authSlice";
import marketReducer from "./slices/marketSlice";
import walletReducer from "./slices/walletSlice";
import orderReducer from "./slices/orderSlice";

// Auth: persisted to localStorage (survives browser close)
const authPersistConfig = {
  key: "probmarket:auth",
  storage,
  whitelist: ["user", "isAuthenticated"],
};

// Wallet: persisted to sessionStorage
const walletPersistConfig = {
  key: "probmarket:wallet",
  storage: sessionStorage,
};

const rootReducer = combineReducers({
  auth: persistReducer(authPersistConfig, authReducer),
  market: marketReducer, // Not persisted — always fresh
  wallet: persistReducer(walletPersistConfig, walletReducer),
  orders: orderReducer, // Not persisted
});

export const store = configureStore({
  reducer: rootReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
      },
    }),
});

export const persistor = persistStore(store);

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;