"use client";
// components/markets/MarketCard.tsx

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { cn, formatVolume, timeRemaining } from "@/lib/utils";
import { Clock, TrendingUp, Users } from "lucide-react";
import type { Market } from "@/types";

interface MarketCardProps {
  market: Market;
}

export function MarketCard({ market }: MarketCardProps) {
  const yesPrice = market.yesStats?.lastPrice ?? 50;
  const noPrice = market.noStats?.lastPrice ?? 50;
  const volume = market.totalVolumeCents;
  const timeLeft = timeRemaining(market.closesAt);
  const isExpiring = new Date(market.closesAt).getTime() - Date.now() < 86400000; // < 1 day

  return (
    <Link href={`/markets/${market._id}`}>
      <div className="group relative rounded-xl border border-border bg-card hover:border-primary/40 hover:shadow-md transition-all duration-200 overflow-hidden cursor-pointer">
        {/* ── Featured indicator ──────────────────────────────── */}
        {market.featured && (
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-primary via-chart-2 to-chart-3" />
        )}

        <div className="p-4 space-y-3">
          {/* ── Header ──────────────────────────────────────────── */}
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium leading-snug line-clamp-2 group-hover:text-primary transition-colors">
                {market.title}
              </p>
            </div>
            <Badge variant="secondary" className="shrink-0 text-[10px]">
              {market.category}
            </Badge>
          </div>

          {/* ── Probability bar ─────────────────────────────────── */}
          <div className="space-y-1.5">
            <div className="flex h-2 rounded-full overflow-hidden bg-muted">
              <div
                className="prob-bar-yes transition-all duration-500"
                style={{ width: `${yesPrice}%` }}
              />
              <div
                className="prob-bar-no flex-1 transition-all duration-500"
              />
            </div>
            <div className="flex justify-between text-xs font-mono font-semibold">
              <span className="text-bullish">{yesPrice}¢ YES</span>
              <span className="text-bearish">NO {noPrice}¢</span>
            </div>
          </div>

          {/* ── Footer stats ────────────────────────────────────── */}
          <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-0.5">
            <span className="flex items-center gap-1">
              <TrendingUp className="size-3" />
              {formatVolume(volume)}
            </span>
            <span className="flex items-center gap-1">
              <Users className="size-3" />
              {market.uniqueTraders}
            </span>
            <span className={cn(
              "flex items-center gap-1",
              isExpiring && market.status === "OPEN" && "text-chart-4"
            )}>
              <Clock className="size-3" />
              {timeLeft}
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}