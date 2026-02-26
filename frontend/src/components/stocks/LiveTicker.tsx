"use client";
// components/stocks/LiveTicker.tsx

import { useAppSelector } from "@/store/hooks";
import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown, Radio } from "lucide-react";

export function LiveTicker() {
  const { stocks, isConnected } = useAppSelector((s) => s.stocks);
  const stockList = Object.values(stocks);

  if (stockList.length === 0) return null;

  // Duplicate list for seamless loop
  const items = [...stockList, ...stockList, ...stockList];

  return (
    <div className="relative border-b border-border/60 bg-card/60 backdrop-blur-sm overflow-hidden h-9 flex items-center">
      {/* Left fade */}
      <div className="absolute left-0 top-0 bottom-0 w-12 z-10 bg-gradient-to-r from-background to-transparent pointer-events-none" />
      
      {/* Live badge */}
      <div className="absolute left-3 z-20 flex items-center gap-1.5 text-[10px] font-bold text-muted-foreground/70 uppercase tracking-widest shrink-0">
        <Radio className={cn("size-3", isConnected ? "text-emerald-400 animate-pulse" : "text-red-400")} />
        <span>Live</span>
      </div>

      {/* Scrolling ticker */}
      <div className="ticker-track flex items-center gap-0 pl-16">
        {items.map((stock, i) => {
          const isPositive = stock.change >= 0;
          return (
            <span
              key={`${stock.symbol}-${i}`}
              className="flex items-center gap-2 px-4 text-xs font-mono shrink-0 border-r border-border/30 last:border-0"
            >
              <span className="font-bold text-foreground/90">{stock.symbol}</span>
              <span className="tabular-nums text-foreground/80">${stock.price.toFixed(2)}</span>
              <span className={cn(
                "flex items-center gap-0.5 font-semibold tabular-nums",
                isPositive ? "text-emerald-400" : "text-red-400"
              )}>
                {isPositive
                  ? <TrendingUp className="size-2.5" />
                  : <TrendingDown className="size-2.5" />
                }
                {isPositive ? "+" : ""}{stock.change.toFixed(2)}
              </span>
            </span>
          );
        })}
      </div>

      {/* Right fade */}
      <div className="absolute right-0 top-0 bottom-0 w-12 z-10 bg-gradient-to-l from-background to-transparent pointer-events-none" />
    </div>
  );
}