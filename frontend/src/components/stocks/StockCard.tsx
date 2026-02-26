"use client";
// components/stocks/StockCard.tsx

import { useEffect, useRef, useState } from "react";
import { useAppDispatch } from "@/store/hooks";
import { clearFlash, StockState } from "@/store/slices/stockSlice";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

interface StockCardProps {
  stock: StockState;
}

function Sparkline({ data, isPositive }: { data: number[]; isPositive: boolean }) {
  if (data.length < 2) return null;
  const w = 120;
  const h = 40;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;

  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w;
    const y = h - ((v - min) / range) * (h - 4) - 2;
    return `${x},${y}`;
  });

  const pathD = `M ${points.join(" L ")}`;
  const fillD = `${pathD} L ${w},${h} L 0,${h} Z`;
  const color = isPositive ? "#22c55e" : "#ef4444";

  return (
    <svg width={w} height={h} className="overflow-visible">
      <defs>
        <linearGradient id={`grad-${isPositive ? "up" : "dn"}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={fillD} fill={`url(#grad-${isPositive ? "up" : "dn"})`} />
      <path d={pathD} stroke={color} strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      {/* last dot */}
      <circle
        cx={parseFloat(points[points.length - 1].split(",")[0])}
        cy={parseFloat(points[points.length - 1].split(",")[1])}
        r="2.5"
        fill={color}
      />
    </svg>
  );
}

export function StockCard({ stock }: StockCardProps) {
  const dispatch = useAppDispatch();
  const isPositive = stock.change >= 0;
  const changePercent = stock.prevPrice > 0
    ? ((stock.price - stock.prevPrice) / stock.prevPrice * 100)
    : 0;
  const dayChangePercent = stock.price > 0 ? ((stock.change / stock.price) * 100) : 0;

  // Flash effect timer
  useEffect(() => {
    if (stock.flash) {
      const t = setTimeout(() => dispatch(clearFlash(stock.symbol)), 600);
      return () => clearTimeout(t);
    }
  }, [stock.flash, stock.symbol, dispatch]);

  const priceStr = stock.price.toFixed(2);

  return (
    <div
      className={cn(
        "stock-card group relative rounded-2xl border p-4 transition-all duration-300 cursor-default overflow-hidden",
        "bg-card/80 backdrop-blur-sm",
        stock.flash === "up" && "flash-up border-emerald-500/60",
        stock.flash === "down" && "flash-down border-red-500/60",
        !stock.flash && "border-border hover:border-border/80",
      )}
    >
      {/* Glow layer */}
      <div className={cn(
        "absolute inset-0 rounded-2xl opacity-0 transition-opacity duration-300 pointer-events-none",
        stock.flash === "up" && "bg-emerald-500/5 opacity-100",
        stock.flash === "down" && "bg-red-500/5 opacity-100",
      )} />

      {/* Top row */}
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-lg font-black tracking-tight font-mono">{stock.symbol}</span>
            <span className={cn(
              "inline-flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full",
              isPositive
                ? "bg-emerald-500/15 text-emerald-400"
                : "bg-red-500/15 text-red-400"
            )}>
              {isPositive ? <TrendingUp className="size-2.5" /> : <TrendingDown className="size-2.5" />}
              {isPositive ? "+" : ""}{dayChangePercent.toFixed(2)}%
            </span>
          </div>
          <p className="text-[10px] text-muted-foreground/60 mt-0.5 font-mono uppercase tracking-wider">
            LIVE · NYSE
          </p>
        </div>
        <div className="text-right">
          <p className={cn(
            "text-xl font-black font-mono tabular-nums tracking-tight transition-colors duration-300",
            stock.flash === "up" && "text-emerald-400",
            stock.flash === "down" && "text-red-400",
            !stock.flash && "text-foreground",
          )}>
            ${priceStr}
          </p>
          <p className={cn(
            "text-xs font-mono font-semibold tabular-nums",
            isPositive ? "text-emerald-500" : "text-red-500"
          )}>
            {isPositive ? "+" : ""}{stock.change.toFixed(2)}
          </p>
        </div>
      </div>

      {/* Sparkline */}
      <div className="flex items-end justify-end opacity-80 group-hover:opacity-100 transition-opacity">
        <Sparkline data={stock.history} isPositive={isPositive} />
      </div>

      {/* Bottom row */}
      <div className="mt-2 pt-2 border-t border-border/50 flex items-center justify-between">
        <span className="text-[10px] text-muted-foreground/50 font-mono">
          {new Date(stock.timestamp).toLocaleTimeString("en-US", {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
          })}
        </span>
        <div className="flex gap-1 items-center">
          <div className={cn(
            "w-1.5 h-1.5 rounded-full animate-pulse",
            isPositive ? "bg-emerald-400" : "bg-red-400"
          )} />
          <span className="text-[10px] text-muted-foreground/50">LIVE</span>
        </div>
      </div>
    </div>
  );
}