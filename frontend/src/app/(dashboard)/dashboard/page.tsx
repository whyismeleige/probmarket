"use client";
// app/(dashboard)/dashboard/page.tsx

import { useEffect } from "react";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { fetchMarkets } from "@/store/slices/marketSlice";
import { Card, CardContent } from "@/components/ui/card";
import { MarketCard } from "@/components/markets/MarketCard";
import { Skeleton } from "@/components/ui/skeleton";
import { cn, formatVolume } from "@/lib/utils";
import { TrendingUp, Wallet2, BarChart3, Activity, ArrowRight, Zap, TrendingDown } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function DashboardPage() {
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((s) => s.auth);
  const { wallet } = useAppSelector((s) => s.wallet);
  const { markets, isLoading } = useAppSelector((s) => s.market);
  const { stocks, isConnected } = useAppSelector((s) => s.stocks);

  useEffect(() => {
    dispatch(fetchMarkets({ limit: 6, sort: "totalVolumeCents", order: "desc", status: "OPEN" }));
  }, [dispatch]);

  const totalBalance = wallet?.totalBalanceCents ?? 0;
  const availableBalance = wallet?.availableBalanceCents ?? 0;
  const reservedBalance = wallet?.reservedBalanceCents ?? 0;

  const stockList = Object.values(stocks).slice(0, 4);
  const topGainer = Object.values(stocks).sort((a, b) => b.change - a.change)[0];
  const topLoser = Object.values(stocks).sort((a, b) => a.change - b.change)[0];

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* ── Header ──────────────────────────────────────────────── */}
      <div>
        <h1 className="text-2xl font-bold">
          Welcome back, {user?.displayName?.split(" ")[0]} 👋
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Trade on world events. Real order books. Real probability.
        </p>
      </div>

      {/* ── Stats row ───────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          title="Total Balance"
          value={`$${(totalBalance / 100).toFixed(2)}`}
          icon={Wallet2}
          description="Cash + reserved"
          color="primary"
        />
        <StatCard
          title="Available"
          value={`$${(availableBalance / 100).toFixed(2)}`}
          icon={Activity}
          description="Ready to trade"
          color="bullish"
        />
        <StatCard
          title="In Orders"
          value={`$${(reservedBalance / 100).toFixed(2)}`}
          icon={BarChart3}
          description="Locked in orders"
          color="muted"
        />
        <StatCard
          title="Markets Traded"
          value={user?.stats?.marketsTraded?.toString() ?? "0"}
          icon={TrendingUp}
          description="All time"
          color="chart2"
        />
      </div>

      {/* ── Live Stocks Mini Panel ─────────────────────────────── */}
      {(stockList.length > 0 || isConnected) && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <h2 className="text-base font-semibold">Live Market</h2>
              {isConnected && (
                <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse inline-block" />
                  LIVE
                </span>
              )}
            </div>
            <Link href="/stocks">
              <Button variant="ghost" size="sm" className="h-7 text-xs gap-1">
                View all <ArrowRight className="size-3" />
              </Button>
            </Link>
          </div>

          {stockList.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
              Connecting to live market feed...
            </div>
          ) : (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {stockList.map((stock) => {
                const isPos = stock.change >= 0;
                return (
                  <Link key={stock.symbol} href="/stocks">
                    <div className={cn(
                      "rounded-xl border p-3 transition-all hover:scale-[1.02] cursor-pointer group",
                      stock.flash === "up" && "border-emerald-500/60 bg-emerald-500/5",
                      stock.flash === "down" && "border-red-500/60 bg-red-500/5",
                      !stock.flash && "border-border hover:border-border/80 bg-card",
                    )}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-black font-mono">{stock.symbol}</span>
                        <span className={cn("text-[10px] font-bold", isPos ? "text-emerald-400" : "text-red-400")}>
                          {isPos ? "+" : ""}{stock.change.toFixed(2)}
                        </span>
                      </div>
                      <p className="text-base font-bold font-mono tabular-nums">${stock.price.toFixed(2)}</p>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── Active Markets ─────────────────────────────────────── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold">Top Markets</h2>
          <Link href="/markets">
            <Button variant="ghost" size="sm" className="h-7 text-xs gap-1">
              View all <ArrowRight className="size-3" />
            </Button>
          </Link>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-40 rounded-xl" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {markets.map((market) => (
              <MarketCard key={market._id} market={market} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({
  title,
  value,
  icon: Icon,
  description,
  color,
}: {
  title: string;
  value: string;
  icon: React.ElementType;
  description: string;
  color: string;
}) {
  return (
    <Card>
      <CardContent className="pt-4 pb-4">
        <div className="flex items-start justify-between mb-2">
          <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">
            {title}
          </p>
          <Icon className="size-4 text-muted-foreground" />
        </div>
        <p className="text-xl font-bold font-mono tabular-nums">{value}</p>
        <p className="text-[11px] text-muted-foreground mt-0.5">{description}</p>
      </CardContent>
    </Card>
  );
}