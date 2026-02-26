"use client";
// components/providers/Providers.tsx
import { ReactNode } from "react";
import { Provider } from "react-redux";
import { PersistGate } from "redux-persist/integration/react";
import { store, persistor } from "@/store";
import { ThemeProvider } from "next-themes";
import { SocketProvider } from "./SocketProvider";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <Provider store={store}>
      <PersistGate loading={null} persistor={persistor}>
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          <SocketProvider>{children}</SocketProvider>
        </ThemeProvider>
      </PersistGate>
    </Provider>
  );
}