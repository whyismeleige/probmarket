"use client";
// app/(dashboard)/portfolio/page.tsx

import { useEffect, useState } from "react";
import { positionsApi } from "@/lib/api/orders.api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { cn, formatPnl, pnlClass } from "@/lib/utils";
import Link from "next/link";
import type { Position, PositionSummary } from "@/types";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";
import { TrendingUp, TrendingDown, Package } from "lucide-react";

export default function PortfolioPage() {
  const [positions, setPositions] = useState<Position[]>([]);
  const [summary, setSummary] = useState<PositionSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    positionsApi.getMyPositions({ settled: false }).then((res) => {
      setPositions(res.data.data.positions);
      setSummary(res.data.data.summary);
    }).finally(() => setIsLoading(false));
  }, []);

  const pieData = positions.slice(0, 8).map((p) => ({
    name: `${typeof p.marketId === "object" ? (p.marketId as { title: string }).title.slice(0, 25) : p.marketId}… (${p.outcome})`,
    value: p.totalCostCents,
  }));

  const COLORS = [
    "var(--chart-1)", "var(--chart-2)", "var(--chart-3)",
    "var(--chart-4)", "var(--chart-5)", "#8b5cf6", "#06b6d4", "#f59e0b",
  ];

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Portfolio</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Your open prediction market positions</p>
      </div>

      {/* ── Summary cards ──────────────────────────────────────── */}
      {summary && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <Card>
            <CardContent className="pt-4">
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Positions</p>
              <p className="text-2xl font-bold font-mono mt-1">{summary.totalPositions}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Invested</p>
              <p className="text-2xl font-bold font-mono mt-1">${summary.totalInvested}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Current Value</p>
              <p className="text-2xl font-bold font-mono mt-1">${summary.totalCurrentValue}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Unrealized P&L</p>
              <p className={cn("text-2xl font-bold font-mono mt-1", pnlClass(summary.totalUnrealizedPnlCents))}>
                {formatPnl(summary.totalUnrealizedPnlCents)}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-4">
        {/* ── Positions list ────────────────────────────────────── */}
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            Open Positions
          </h2>
          {isLoading ? (
            Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)
          ) : positions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center border border-dashed border-border rounded-xl">
              <Package className="size-8 text-muted-foreground/40 mb-2" />
              <p className="text-muted-foreground">No open positions</p>
              <p className="text-sm text-muted-foreground/60 mt-1">
                <Link href="/markets" className="text-primary hover:underline">Browse markets</Link> to start trading
              </p>
            </div>
          ) : (
            positions.map((pos) => (
              <PositionCard key={pos._id} position={pos} />
            ))
          )}
        </div>

        {/* ── Pie chart ─────────────────────────────────────────── */}
        {positions.length > 0 && (
          <Card className="h-fit">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Allocation</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {pieData.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(v: number) => `$${(v / 100).toFixed(2)}`}
                    contentStyle={{
                      background: "var(--popover)",
                      border: "1px solid var(--border)",
                      borderRadius: "8px",
                      fontSize: "11px",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

function PositionCard({ position }: { position: Position }) {
  const market = typeof position.marketId === "object" ? position.marketId as { _id: string; title: string; status: string } : null;
  const pnl = position.unrealizedPnlCents ?? 0;
  const pnlPercent = position.unrealizedPnlPercent ?? "0.00";

  return (
    <Link href={market ? `/markets/${market._id}` : "#"}>
      <div className="group rounded-xl border border-border bg-card hover:border-primary/30 transition-all p-4 space-y-2.5">
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm font-medium line-clamp-1 flex-1 group-hover:text-primary transition-colors">
            {market?.title ?? "Unknown market"}
          </p>
          <Badge variant={position.outcome === "YES" ? "default" : "secondary"} className="shrink-0">
            {position.outcome}
          </Badge>
        </div>

        <div className="grid grid-cols-4 gap-2 text-xs font-mono">
          <div>
            <p className="text-[10px] text-muted-foreground uppercase mb-0.5">Shares</p>
            <p className="font-semibold tabular-nums">{position.quantity.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-[10px] text-muted-foreground uppercase mb-0.5">Avg Cost</p>
            <p className="font-semibold tabular-nums">{position.avgCostCents}¢</p>
          </div>
          <div>
            <p className="text-[10px] text-muted-foreground uppercase mb-0.5">Current</p>
            <p className="font-semibold tabular-nums">
              {position.currentPriceCents ? `${position.currentPriceCents}¢` : "—"}
            </p>
          </div>
          <div>
            <p className="text-[10px] text-muted-foreground uppercase mb-0.5">P&L</p>
            <p className={cn("font-semibold tabular-nums flex items-center gap-0.5", pnlClass(pnl))}>
              {pnl >= 0 ? <TrendingUp className="size-3" /> : <TrendingDown className="size-3" />}
              {formatPnl(pnl)}
            </p>
          </div>
        </div>
      </div>
    </Link>
  );
}