"use client";
// components/markets/OrderBook.tsx
// Real-time order book display showing bid/ask depth for YES and NO outcomes

import { useMemo } from "react";
import { cn } from "@/lib/utils";
import type { HalfBookSnapshot, MarketOrderBookSnapshot } from "@/types";
import { Skeleton } from "@/components/ui/skeleton";

interface OrderBookProps {
  orderBook: MarketOrderBookSnapshot | null;
  activeOutcome?: "YES" | "NO";
  onPriceClick?: (priceCents: number, side: "BUY" | "SELL") => void;
}

const DEPTH = 8;

function HalfBook({
  snapshot,
  outcome,
  onPriceClick,
}: {
  snapshot: HalfBookSnapshot | null;
  outcome: "YES" | "NO";
  onPriceClick?: (priceCents: number, side: "BUY" | "SELL") => void;
}) {
  if (!snapshot) {
    return (
      <div className="space-y-1">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-6 w-full" />
        ))}
      </div>
    );
  }

  const asks = snapshot.asks.slice(0, DEPTH);
  const bids = snapshot.bids.slice(0, DEPTH);

  // Max quantity for depth bar width calculation
  const maxQty = Math.max(
    ...asks.map((a) => a.totalQuantity),
    ...bids.map((b) => b.totalQuantity),
    1
  );

  const isYes = outcome === "YES";
  const bidColor = isYes
    ? "oklch(0.65 0.18 145"
    : "oklch(0.58 0.22 17.5"; // YES bids = green, NO bids = red

  return (
    <div className="space-y-0.5">
      {/* ── Column headers ─────────────────────────────────────────── */}
      <div className="grid grid-cols-3 text-[10px] font-medium text-muted-foreground px-2 pb-1">
        <span>PRICE</span>
        <span className="text-right">SHARES</span>
        <span className="text-right">TOTAL</span>
      </div>

      {/* ── Asks (sell orders) — sorted lowest to highest ─────────── */}
      <div className="space-y-px">
        {asks.length === 0 ? (
          <div className="text-[11px] text-muted-foreground text-center py-2">No asks</div>
        ) : (
          [...asks].reverse().map((level, i) => {
            const barWidth = `${(level.totalQuantity / maxQty) * 100}%`;
            return (
              <div
                key={`ask-${level.priceCents}-${i}`}
                className="relative grid grid-cols-3 items-center px-2 py-0.5 rounded text-xs cursor-pointer group hover:bg-accent/50 transition-colors"
                onClick={() => onPriceClick?.(level.priceCents, "BUY")}
              >
                {/* Depth bar */}
                <div
                  className="absolute inset-y-0 right-0 rounded opacity-20"
                  style={{
                    width: barWidth,
                    background: `oklch(0.58 0.22 17.5)`,
                  }}
                />
                <span className="relative font-mono font-semibold text-[oklch(0.7_0.18_17.5)]">
                  {level.priceCents}¢
                </span>
                <span className="relative text-right font-mono text-muted-foreground">
                  {level.totalQuantity.toLocaleString()}
                </span>
                <span className="relative text-right font-mono text-muted-foreground text-[10px]">
                  ${((level.priceCents * level.totalQuantity) / 100).toFixed(0)}
                </span>
              </div>
            );
          })
        )}
      </div>

      {/* ── Spread indicator ───────────────────────────────────────── */}
      <div className="flex items-center justify-between px-2 py-1 border-y border-border/50 my-1">
        {snapshot.lastTradePriceCents !== null ? (
          <span className="font-mono font-bold text-sm text-foreground">
            {snapshot.lastTradePriceCents}¢
            <span className="text-xs text-muted-foreground ml-1 font-normal">last</span>
          </span>
        ) : (
          <span className="text-xs text-muted-foreground">No trades yet</span>
        )}
        {snapshot.spread !== null && (
          <span className="text-[10px] text-muted-foreground font-mono">
            spread {snapshot.spread}¢
          </span>
        )}
      </div>

      {/* ── Bids (buy orders) — sorted highest to lowest ──────────── */}
      <div className="space-y-px">
        {bids.length === 0 ? (
          <div className="text-[11px] text-muted-foreground text-center py-2">No bids</div>
        ) : (
          bids.map((level, i) => {
            const barWidth = `${(level.totalQuantity / maxQty) * 100}%`;
            return (
              <div
                key={`bid-${level.priceCents}-${i}`}
                className="relative grid grid-cols-3 items-center px-2 py-0.5 rounded text-xs cursor-pointer group hover:bg-accent/50 transition-colors"
                onClick={() => onPriceClick?.(level.priceCents, "SELL")}
              >
                <div
                  className="absolute inset-y-0 right-0 rounded opacity-20"
                  style={{ width: barWidth, background: `${bidColor})` }}
                />
                <span className={cn("relative font-mono font-semibold", isYes ? "text-bullish" : "text-bearish")}>
                  {level.priceCents}¢
                </span>
                <span className="relative text-right font-mono text-muted-foreground">
                  {level.totalQuantity.toLocaleString()}
                </span>
                <span className="relative text-right font-mono text-muted-foreground text-[10px]">
                  ${((level.priceCents * level.totalQuantity) / 100).toFixed(0)}
                </span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

export function OrderBook({ orderBook, activeOutcome = "YES", onPriceClick }: OrderBookProps) {
  return (
    <div className="space-y-4">
      {/* ── YES Order Book ──────────────────────────────────────────── */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <div className="w-2 h-2 rounded-full bg-[oklch(0.65_0.18_145)]" />
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            YES
          </span>
          {orderBook?.YES?.bestBid && (
            <span className="ml-auto text-xs font-mono text-bullish">
              bid {orderBook.YES.bestBid}¢
            </span>
          )}
          {orderBook?.YES?.bestAsk && (
            <span className="text-xs font-mono text-muted-foreground">
              ask {orderBook.YES.bestAsk}¢
            </span>
          )}
        </div>
        <HalfBook
          snapshot={orderBook?.YES ?? null}
          outcome="YES"
          onPriceClick={onPriceClick}
        />
      </div>

      {/* ── NO Order Book ───────────────────────────────────────────── */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <div className="w-2 h-2 rounded-full bg-[oklch(0.58_0.22_17.5)]" />
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            NO
          </span>
          {orderBook?.NO?.bestBid && (
            <span className="ml-auto text-xs font-mono text-bearish">
              bid {orderBook.NO.bestBid}¢
            </span>
          )}
          {orderBook?.NO?.bestAsk && (
            <span className="text-xs font-mono text-muted-foreground">
              ask {orderBook.NO.bestAsk}¢
            </span>
          )}
        </div>
        <HalfBook
          snapshot={orderBook?.NO ?? null}
          outcome="NO"
          onPriceClick={onPriceClick}
        />
      </div>
    </div>
  );
}