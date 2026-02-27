"use client";
// app/(dashboard)/stocks/page.tsx

import { useEffect, useState } from "react";
import { useAppSelector } from "@/store/hooks";
import { StockCard } from "@/components/stocks/StockCard";
import {
  Activity,
  TrendingUp,
  TrendingDown,
  Wifi,
  WifiOff,
  BarChart3,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/shared/PageHeader";

export default function StocksPage() {
  const { stocks, isConnected } = useAppSelector((s) => s.stocks);
  const stockList = Object.values(stocks);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 50);
    return () => clearTimeout(t);
  }, []);

  const gainers = stockList
    .filter((s) => s.change > 0)
    .sort((a, b) => b.change - a.change);
  const losers = stockList
    .filter((s) => s.change < 0)
    .sort((a, b) => a.change - b.change);
  const totalPositive = gainers.length;
  const totalNegative = losers.length;
  const marketSentiment =
    totalPositive >= totalNegative ? "bullish" : "bearish";

  return (
    <div className="min-h-screen bg-background">
      {/* ── Consistent page header ── */}
      <PageHeader
        icon={Activity}
        iconClass="bg-primary/10 border-primary/20 text-primary"
        title="Live Market"
        subtitle="Real-time simulated market data · Updates every 2 seconds"
        actions={
          <div className="flex items-center gap-3">
            {/* Connection status badge */}
            <div
              className={cn(
                "flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full border",
                isConnected
                  ? "text-emerald-400 border-emerald-500/30 bg-emerald-500/10"
                  : "text-muted-foreground border-border bg-muted/30",
              )}
            >
              {isConnected ? (
                <Wifi className="size-3" />
              ) : (
                <WifiOff className="size-3" />
              )}
              {isConnected ? "LIVE" : "Connecting..."}
            </div>

            {/* Sentiment badge */}
            {stockList.length > 0 && (
              <div
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold",
                  marketSentiment === "bullish"
                    ? "border-emerald-500/30 bg-emerald-500/5 text-emerald-400"
                    : "border-red-500/30 bg-red-500/5 text-red-400",
                )}
              >
                {marketSentiment === "bullish" ? (
                  <TrendingUp className="size-3.5" />
                ) : (
                  <TrendingDown className="size-3.5" />
                )}
                {marketSentiment === "bullish" ? "BULLISH" : "BEARISH"}
              </div>
            )}
          </div>
        }
      >
        {/* Stat pills below header */}
        {stockList.length > 0 && (
          <div className="flex items-center gap-6 text-xs text-muted-foreground font-mono">
            <span className="flex items-center gap-1.5">
              <BarChart3 className="size-3.5" />
              {stockList.length} symbols tracked
            </span>
            <span className="flex items-center gap-1.5">
              <Zap className="size-3.5" />
              2s refresh rate
            </span>
            {gainers[0] && (
              <span className="flex items-center gap-1.5 text-emerald-400">
                <TrendingUp className="size-3.5" />
                Top: {gainers[0].symbol} +{gainers[0].change.toFixed(2)}
              </span>
            )}
            {losers[0] && (
              <span className="flex items-center gap-1.5 text-red-400">
                <TrendingDown className="size-3.5" />
                Worst: {losers[0].symbol} {losers[0].change.toFixed(2)}
              </span>
            )}
          </div>
        )}
      </PageHeader>

      {/* ── Main content ── */}
      <div className="p-6 max-w-7xl mx-auto">
        {stockList.length === 0 ? (
          /* Loading skeleton */
          <div>
            <div className="flex items-center gap-2 mb-6">
              <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              <span className="text-sm text-muted-foreground">
                {isConnected
                  ? "Waiting for market data..."
                  : "Connecting to market feed..."}
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton
                  key={i}
                  className="h-36 rounded-2xl"
                  style={{ animationDelay: `${i * 80}ms` }}
                />
              ))}
            </div>
          </div>
        ) : (
          <div
            className={cn(
              "transition-all duration-500",
              mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4",
            )}
          >
            {/* ── All stocks grid ── */}
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
                All Symbols — {stockList.length} active
              </h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {stockList.map((stock, i) => (
                <div
                  key={stock.symbol}
                  className="transition-all duration-500"
                  style={{ animationDelay: `${i * 50}ms` }}
                >
                  <StockCard stock={stock} />
                </div>
              ))}
            </div>

            {/* ── Gainers / Losers ── */}
            {(gainers.length > 0 || losers.length > 0) && (
              <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Top Gainers */}
                <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <TrendingUp className="size-4 text-emerald-400" />
                    <h3 className="text-sm font-bold text-emerald-400">
                      Top Gainers
                    </h3>
                  </div>
                  <div className="space-y-2">
                    {gainers.slice(0, 5).map((stock) => (
                      <div
                        key={stock.symbol}
                        className="flex items-center justify-between text-xs"
                      >
                        <span className="font-bold font-mono">
                          {stock.symbol}
                        </span>
                        <div className="flex items-center gap-3">
                          <span className="text-muted-foreground font-mono">
                            ${stock.price.toFixed(2)}
                          </span>
                          <span className="text-emerald-400 font-bold font-mono">
                            +{stock.change.toFixed(2)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Top Losers */}
                <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <TrendingDown className="size-4 text-red-400" />
                    <h3 className="text-sm font-bold text-red-400">
                      Top Losers
                    </h3>
                  </div>
                  <div className="space-y-2">
                    {losers.slice(0, 5).map((stock) => (
                      <div
                        key={stock.symbol}
                        className="flex items-center justify-between text-xs"
                      >
                        <span className="font-bold font-mono">
                          {stock.symbol}
                        </span>
                        <div className="flex items-center gap-3">
                          <span className="text-muted-foreground font-mono">
                            ${stock.price.toFixed(2)}
                          </span>
                          <span className="text-red-400 font-bold font-mono">
                            {stock.change.toFixed(2)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}