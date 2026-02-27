"use client";
// components/markets/PriceChart.tsx
// Shows YES probability over time with volume bars. Multiple time ranges.

import { useState, useEffect } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  ReferenceLine,
} from "recharts";
import { Button } from "@/components/ui/button";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { fetchPriceHistory } from "@/store/slices/marketSlice";
import type { PricePoint } from "@/types";
import { Skeleton } from "@/components/ui/skeleton";

const RANGES = ["1H", "6H", "1D", "1W", "1M", "ALL"] as const;
type Range = (typeof RANGES)[number];

interface PriceChartProps {
  marketId: string;
  currentYesPrice?: number;
}

interface ChartDataPoint {
  time: string;
  yesPrice: number;
  noPrice: number;
  volume: number;
  timestamp: number;
}

const formatTime = (timestamp: number, range: Range): string => {
  const d = new Date(timestamp);
  if (range === "1H" || range === "6H" || range === "1D") {
    return d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
  }
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
};

// ── Custom tooltip ─────────────────────────────────────────────────────────────
function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { value: number; name: string }[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  const yes = payload.find((p) => p.name === "yesPrice");
  const vol = payload.find((p) => p.name === "volume");

  return (
    <div
      className="rounded-lg border border-border bg-popover px-3 py-2 shadow-xl text-[11px] font-mono"
      style={{ minWidth: 110 }}
    >
      <p className="text-muted-foreground mb-1">{label}</p>
      {yes && (
        <p className="text-emerald-400 font-semibold">
          YES {yes.value.toFixed(1)}¢
        </p>
      )}
      {vol && (
        <p className="text-muted-foreground">
          Vol {vol.value.toFixed(0)}
        </p>
      )}
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────
export function PriceChart({ marketId, currentYesPrice }: PriceChartProps) {
  const dispatch = useAppDispatch();
  const { priceHistory, isLoading } = useAppSelector((s) => s.market);

  const [range, setRange] = useState<Range>("1D");
  const [chartType, setChartType] = useState<"area" | "volume">("area");

  // ✅ FIX: recharts' ResponsiveContainer reads DOM dimensions on mount.
  // In Next.js SSR the DOM doesn't exist, so we defer rendering to the client.
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (marketId) {
      dispatch(fetchPriceHistory({ id: marketId, range }));
    }
  }, [marketId, range, dispatch]);

  // Transform backend PricePoint array → chart-friendly shape
  const chartData: ChartDataPoint[] = (priceHistory ?? []).map(
    (pt: PricePoint) => ({
      time: formatTime(new Date(pt.timestamp).getTime(), range),
      yesPrice: pt.yesPrice,
      noPrice: 100 - pt.yesPrice,
      volume: pt.volume ?? 0,
      timestamp: new Date(pt.timestamp).getTime(),
    }),
  );

  const priceChange =
    chartData.length >= 2
      ? chartData[chartData.length - 1].yesPrice - chartData[0].yesPrice
      : 0;
  const isPositive = priceChange >= 0;

  // Gradient IDs — stable per component instance
  const areaGradId = `price-chart-area-${marketId}`;

  return (
    <div className="space-y-3">
      {/* ── Header row ──────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black font-mono tabular-nums">
              {currentYesPrice ?? chartData[chartData.length - 1]?.yesPrice ?? 50}¢
            </span>
            <span
              className={`text-sm font-semibold font-mono ${
                isPositive ? "text-emerald-400" : "text-red-400"
              }`}
            >
              {isPositive ? "+" : ""}
              {priceChange.toFixed(1)}¢
            </span>
          </div>
          <p className="text-xs text-muted-foreground">YES probability</p>
        </div>

        {/* Chart type toggle */}
        <div className="flex gap-1">
          <Button
            size="sm"
            variant={chartType === "area" ? "secondary" : "ghost"}
            className="h-7 text-xs"
            onClick={() => setChartType("area")}
          >
            Area
          </Button>
          <Button
            size="sm"
            variant={chartType === "volume" ? "secondary" : "ghost"}
            className="h-7 text-xs"
            onClick={() => setChartType("volume")}
          >
            Vol
          </Button>
        </div>
      </div>

      {/* ── Time range selector ──────────────────────────────────── */}
      <div className="flex gap-1">
        {RANGES.map((r) => (
          <Button
            key={r}
            size="sm"
            variant={range === r ? "secondary" : "ghost"}
            className="h-7 px-2 text-xs font-mono"
            onClick={() => setRange(r)}
          >
            {r}
          </Button>
        ))}
      </div>

      {/* ── Chart ───────────────────────────────────────────────── */}
      <div className="h-48 w-full">
        {isLoading? (
          <Skeleton className="h-full w-full rounded-lg" />
        ) : !mounted ? (
          // Show placeholder while hydrating to avoid SSR mismatch
          <Skeleton className="h-full w-full rounded-lg opacity-40" />
        ) : chartData.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border">
            <p className="text-sm text-muted-foreground">No price history yet</p>
            <p className="text-xs text-muted-foreground/60">
              Data will appear once trading begins
            </p>
          </div>
        ) : chartType === "area" ? (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={chartData}
              margin={{ top: 4, right: 4, left: -20, bottom: 0 }}
            >
              <defs>
                <linearGradient id={areaGradId} x1="0" y1="0" x2="0" y2="1">
                  <stop
                    offset="5%"
                    stopColor="oklch(0.65 0.18 145)"
                    stopOpacity={0.3}
                  />
                  <stop
                    offset="95%"
                    stopColor="oklch(0.65 0.18 145)"
                    stopOpacity={0}
                  />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="var(--border)"
                opacity={0.5}
              />
              <XAxis
                dataKey="time"
                tick={{
                  fontSize: 10,
                  fill: "var(--muted-foreground)",
                  fontFamily: "var(--font-mono)",
                }}
                tickLine={false}
                axisLine={false}
                interval="preserveStartEnd"
              />
              <YAxis
                domain={[0, 100]}
                tick={{
                  fontSize: 10,
                  fill: "var(--muted-foreground)",
                  fontFamily: "var(--font-mono)",
                }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => `${v}¢`}
              />
              <Tooltip content={<CustomTooltip />} />
              <ReferenceLine
                y={50}
                stroke="var(--border)"
                strokeDasharray="4 4"
                strokeOpacity={0.6}
              />
              <Area
                type="monotone"
                dataKey="yesPrice"
                stroke="oklch(0.65 0.18 145)"
                strokeWidth={2}
                fill={`url(#${areaGradId})`}
                dot={false}
                activeDot={{ r: 4, fill: "oklch(0.65 0.18 145)" }}
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          /* Volume bar chart */
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              margin={{ top: 4, right: 4, left: -20, bottom: 0 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="var(--border)"
                opacity={0.5}
              />
              <XAxis
                dataKey="time"
                tick={{
                  fontSize: 10,
                  fill: "var(--muted-foreground)",
                  fontFamily: "var(--font-mono)",
                }}
                tickLine={false}
                axisLine={false}
                interval="preserveStartEnd"
              />
              <YAxis
                tick={{
                  fontSize: 10,
                  fill: "var(--muted-foreground)",
                  fontFamily: "var(--font-mono)",
                }}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar
                dataKey="volume"
                fill="oklch(0.55 0.22 264 / 0.6)"
                radius={[2, 2, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}