"use client";
// app/(dashboard)/dashboard/page.tsx

import { useEffect } from "react";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { fetchWallet } from "@/store/slices/walletSlice";
import { fetchMarkets } from "@/store/slices/marketSlice";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { MarketCard } from "@/components/markets/MarketCard";
import { PageHeader } from "@/components/shared/PageHeader";
import {
  LayoutDashboard,
  TrendingUp,
  Wallet,
  Activity,
  Zap,
  ArrowRight,
} from "lucide-react";
import Link from "next/link";

export default function DashboardPage() {
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((s) => s.auth);
  const { wallet, isLoading: walletLoading } = useAppSelector((s) => s.wallet);
  const { markets, isLoading } = useAppSelector((s) => s.market);
  const { stocks, isConnected } = useAppSelector((s) => s.stocks);

  const stockList = Object.values(stocks).slice(0, 6);
  const gainers = [...stockList]
    .filter((s) => s.change > 0)
    .sort((a, b) => b.change - a.change)
    .slice(0, 3);

  useEffect(() => {
    dispatch(fetchWallet());
    dispatch(
      fetchMarkets({ status: "OPEN", sort: "totalVolumeCents", order: "desc", limit: 6 }),
    );
  }, [dispatch]);

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 17) return "Good afternoon";
    return "Good evening";
  };

  return (
    <div className="min-h-screen bg-background">
      {/* ── Consistent page header ── */}
      <PageHeader
        icon={LayoutDashboard}
        iconClass="bg-primary/10 border-primary/20 text-primary"
        title={user ? `${greeting()}, ${user.displayName ?? user.username}` : "Dashboard"}
        subtitle="Here's what's happening in your account today"
      />

      <div className="p-6 max-w-6xl mx-auto space-y-8">
        {/* ── Account stat cards ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard
            title="Available Balance"
            value={walletLoading ? null : `$${wallet?.availableBalance ?? "0.00"}`}
            icon={Wallet}
            description="Ready to trade"
            color="text-primary"
          />
          <StatCard
            title="Reserved"
            value={walletLoading ? null : `$${wallet?.reservedBalance ?? "0.00"}`}
            icon={Activity}
            description="In open orders"
            color="text-muted-foreground"
          />
          <StatCard
            title="Market Feed"
            value={isConnected ? "LIVE" : "Offline"}
            icon={Zap}
            description={`${Object.keys(stocks).length} stocks tracked`}
            color={isConnected ? "text-emerald-400" : "text-red-400"}
          />
          <StatCard
            title="Open Markets"
            value={isLoading ? null : String(markets.length)}
            icon={TrendingUp}
            description="Available to trade"
            color="text-chart-2"
          />
        </div>

        {/* ── Live stocks strip ── */}
        {stockList.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-semibold flex items-center gap-2">
                <Zap className="size-4 text-primary" />
                Live Stocks
              </h2>
              <Link href="/stocks">
                <Button variant="ghost" size="sm" className="h-7 text-xs gap-1">
                  View all <ArrowRight className="size-3" />
                </Button>
              </Link>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
              {stockList.map((stock) => {
                const isPos = stock.change >= 0;
                return (
                  <Link key={stock.symbol} href="/stocks">
                    <div className="rounded-xl border border-border bg-card hover:border-primary/30 transition-all p-3 cursor-pointer">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-black font-mono">
                          {stock.symbol}
                        </span>
                        <span
                          className={`text-[10px] font-semibold ${isPos ? "text-emerald-400" : "text-red-400"}`}
                        >
                          {isPos ? "+" : ""}
                          {stock.change.toFixed(2)}
                        </span>
                      </div>
                      <p className="text-base font-bold font-mono tabular-nums">
                        ${stock.price.toFixed(2)}
                      </p>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Top markets ── */}
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
    </div>
  );
}

// ── Stat card component ────────────────────────────────────────────────────────
function StatCard({
  title,
  value,
  icon: Icon,
  description,
  color,
}: {
  title: string;
  value: string | null;
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
          <Icon className={`size-4 ${color} opacity-70`} />
        </div>
        {value === null ? (
          <Skeleton className="h-7 w-20" />
        ) : (
          <p className={`text-xl font-bold font-mono tabular-nums ${color}`}>
            {value}
          </p>
        )}
        <p className="text-[11px] text-muted-foreground mt-0.5">{description}</p>
      </CardContent>
    </Card>
  );
}