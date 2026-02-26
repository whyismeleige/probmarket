"use client";
// components/markets/RecentTrades.tsx

import { cn, formatDateTime } from "@/lib/utils";
import type { Trade } from "@/types";
import { Skeleton } from "@/components/ui/skeleton";

interface RecentTradesProps {
  trades?: Trade[];
  isLoading?: boolean;
  maxRows?: number;
}

export function RecentTrades({ trades = [], isLoading = false, maxRows = 20 }: RecentTradesProps) {
  if (isLoading) {
    return (
      <div className="space-y-1">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-6 w-full" />
        ))}
      </div>
    );
  }

  if (trades.length === 0) {
    return (
      <div className="text-center text-sm text-muted-foreground py-6">
        No trades yet — be the first!
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="grid grid-cols-4 text-[10px] font-medium text-muted-foreground px-2 pb-1.5 uppercase tracking-wide">
        <span>OUTCOME</span>
        <span className="text-right">PRICE</span>
        <span className="text-right">SHARES</span>
        <span className="text-right">TIME</span>
      </div>

      <div className="space-y-px">
        {trades.slice(0, maxRows).map((trade) => (
          <div
            key={trade._id}
            className="grid grid-cols-4 items-center px-2 py-1 rounded text-xs hover:bg-accent/30 transition-colors"
          >
            <span className={cn(
              "font-semibold",
              trade.outcome === "YES" ? "text-bullish" : "text-bearish"
            )}>
              {trade.outcome}
            </span>
            <span className="text-right font-mono tabular-nums">
              {trade.priceCents}¢
            </span>
            <span className="text-right font-mono text-muted-foreground tabular-nums">
              {trade.quantity.toLocaleString()}
            </span>
            <span className="text-right text-[10px] text-muted-foreground">
              {new Date(trade.executedAt).toLocaleTimeString("en-US", {
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
              })}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}