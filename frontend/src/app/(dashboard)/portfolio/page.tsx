"use client";
// app/(dashboard)/portfolio/page.tsx

import { useEffect, useState } from "react";
import { positionsApi } from "@/lib/api/orders.api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { cn, formatPnl, pnlClass } from "@/lib/utils";
import Link from "next/link";
import type { Position, PositionSummary } from "@/types";
import { TrendingUp, TrendingDown, Package, BarChart3 } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";

// ── Recharts — lazy to avoid SSR hydration errors ─────────────────────────────
import dynamic from "next/dynamic";

const DynamicPieChart = dynamic(
  () =>
    import("recharts").then((mod) => {
      const { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } = mod;

      return function PortfolioPie({ data }: { data: { name: string; value: number }[] }) {
        const COLORS = [
          "oklch(0.55 0.22 264)",
          "oklch(0.65 0.18 145)",
          "oklch(0.72 0.19 70)",
          "oklch(0.60 0.24 303)",
          "oklch(0.62 0.22 16)",
          "#8b5cf6",
          "#06b6d4",
          "#f59e0b",
        ];

        return (
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={80}
                paddingAngle={2}
                dataKey="value"
              >
                {data.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  background: "var(--popover)",
                  border: "1px solid var(--border)",
                  borderRadius: "8px",
                  fontSize: "11px",
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        );
      };
    }),
  { ssr: false, loading: () => <Skeleton className="h-[200px] w-full" /> },
);

// ─── Page ──────────────────────────────────────────────────────────────────────
export default function PortfolioPage() {
  const [positions, setPositions] = useState<Position[]>([]);
  const [summary, setSummary] = useState<PositionSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    positionsApi
      .getMyPositions({ settled: false })
      .then((res) => {
        setPositions(res.data.data.positions);
        setSummary(res.data.data.summary);
      })
      .finally(() => setIsLoading(false));
  }, []);

  const pieData = positions.slice(0, 8).map((p) => ({
    name: `${
      typeof p.marketId === "object"
        ? (p.marketId as { title: string }).title.slice(0, 25)
        : p.marketId
    }… (${p.outcome})`,
    value: p.totalCostCents,
  }));

  return (
    <div className="min-h-screen bg-background">
      {/* ── Consistent page header ── */}
      <PageHeader
        icon={BarChart3}
        iconClass="bg-chart-1/10 border-chart-1/20 text-chart-1"
        title="Portfolio"
        subtitle="Your open prediction market positions"
      />

      <div className="p-6 max-w-6xl mx-auto space-y-6">
        {/* ── Summary stat cards ─────────────────────────────── */}
        {summary && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <SummaryCard
              label="Positions"
              value={String(summary.totalPositions)}
            />
            <SummaryCard label="Invested" value={`$${summary.totalInvested}`} />
            <SummaryCard
              label="Current Value"
              value={`$${summary.totalCurrentValue}`}
            />
            <SummaryCard
              label="Unrealized P&L"
              value={formatPnl(summary.totalUnrealizedPnlCents)}
              valueClass={pnlClass(summary.totalUnrealizedPnlCents)}
            />
          </div>
        )}

        {/* ── Positions + Pie layout ─────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-6">
          {/* Positions list */}
          <div className="space-y-3">
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
              Open Positions
            </h2>

            {isLoading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-20 rounded-xl" />
              ))
            ) : positions.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center border border-dashed border-border rounded-xl">
                <Package className="size-8 text-muted-foreground/40 mb-2" />
                <p className="text-muted-foreground">No open positions</p>
                <p className="text-sm text-muted-foreground/60 mt-1">
                  <Link
                    href="/markets"
                    className="text-primary hover:underline"
                  >
                    Browse markets
                  </Link>{" "}
                  to start trading
                </p>
              </div>
            ) : (
              positions.map((pos) => (
                <PositionCard key={pos._id} position={pos} />
              ))
            )}
          </div>

          {/* Allocation pie chart */}
          {positions.length > 0 && (
            <Card className="h-fit sticky top-6">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Allocation</CardTitle>
              </CardHeader>
              <CardContent>
                <DynamicPieChart data={pieData} />
                {/* Legend */}
                <div className="mt-3 space-y-1">
                  {pieData.map((d, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-2 text-[11px] text-muted-foreground"
                    >
                      <span
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{
                          background: [
                            "oklch(0.55 0.22 264)",
                            "oklch(0.65 0.18 145)",
                            "oklch(0.72 0.19 70)",
                            "oklch(0.60 0.24 303)",
                            "oklch(0.62 0.22 16)",
                            "#8b5cf6",
                            "#06b6d4",
                            "#f59e0b",
                          ][i % 8],
                        }}
                      />
                      <span className="truncate">{d.name}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Summary stat card ──────────────────────────────────────────────────────────
function SummaryCard({
  label,
  value,
  valueClass,
}: {
  label: string;
  value: string;
  valueClass?: string;
}) {
  return (
    <Card>
      <CardContent className="pt-4 pb-4">
        <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
          {label}
        </p>
        <p className={cn("text-2xl font-bold font-mono tabular-nums", valueClass)}>
          {value}
        </p>
      </CardContent>
    </Card>
  );
}

// ── Position card ──────────────────────────────────────────────────────────────
function PositionCard({ position }: { position: Position }) {
  const market =
    typeof position.marketId === "object"
      ? (position.marketId as { _id: string; title: string; status: string })
      : null;
  const pnl = position.unrealizedPnlCents ?? 0;
  const pnlPercent = position.unrealizedPnlPercent ?? "0.00";
  const isUp = pnl >= 0;

  return (
    <Link href={market ? `/markets/${market._id}` : "#"}>
      <div className="group rounded-xl border border-border bg-card hover:border-primary/30 hover:shadow-sm transition-all p-4 space-y-2.5">
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm font-medium line-clamp-1 flex-1 group-hover:text-primary transition-colors">
            {market?.title ?? "Unknown market"}
          </p>
          <Badge
            variant={position.outcome === "YES" ? "default" : "secondary"}
            className="shrink-0"
          >
            {position.outcome}
          </Badge>
        </div>

        <Separator />

        <div className="flex items-center justify-between text-xs font-mono">
          <div className="space-y-0.5">
            <p className="text-muted-foreground">
              {position.quantity} shares · avg{" "}
              {position.avgCostCents}¢
            </p>
            <p className="text-muted-foreground">
              Cost ${(position.totalCostCents / 100).toFixed(2)}
            </p>
          </div>
          <div className="text-right space-y-0.5">
            <p className={cn("font-semibold", pnlClass(pnl))}>
              {isUp ? "+" : ""}
              {formatPnl(pnl)}
            </p>
            <div className="flex items-center justify-end gap-1">
              {isUp ? (
                <TrendingUp className="size-3 text-emerald-400" />
              ) : (
                <TrendingDown className="size-3 text-red-400" />
              )}
              <span className={cn(pnlClass(pnl))}>
                {isUp ? "+" : ""}
                {pnlPercent}%
              </span>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}