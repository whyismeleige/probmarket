"use client";
// app/(dashboard)/layout.tsx

import { useEffect } from "react";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { fetchProfile } from "@/store/slices/authSlice";
import { fetchWallet } from "@/store/slices/walletSlice";
import { useRouter } from "next/navigation";
import { AppSidebar } from "@/components/shared/AppSidebar";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAppSelector((s) => s.auth);

  useEffect(() => {
    dispatch(fetchProfile()).then((result) => {
      if (fetchProfile.rejected.match(result)) {
        router.push("/auth");
      }
    });
  }, [dispatch, router]);

  useEffect(() => {
    if (isAuthenticated) {
      dispatch(fetchWallet());
    }
  }, [isAuthenticated, dispatch]);

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-muted-foreground">Loading ProbMarket...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-background">
      <AppSidebar />
      {/*
        On mobile the sidebar becomes a fixed overlay and we render a fixed top bar (h-14).
        Add pt-14 on mobile so page content isn't hidden under that bar.
        On lg+ the sidebar is in the normal flow so no extra padding is needed.
      */}
      <main className="flex-1 min-w-0 overflow-auto pt-14 lg:pt-0">
        {children}
      </main>
    </div>
  );
}