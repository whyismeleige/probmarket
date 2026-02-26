"use client";
// components/markets/PriceChart.tsx
// Shows YES price over time with volume bars. Multiple time ranges.

import { useState, useCallback, useEffect } from "react";
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
  ComposedChart,
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
  if (range === "1H" || range === "6H") {
    return d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
  }
  if (range === "1D") {
    return d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
  }
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
};

const CustomTooltip = ({ active, payload, label }: {
  active?: boolean;
  payload?: { value: number; name: string }[];
  label?: string;
}) => {
  if (!active || !payload?.length) return null;
  const yes = payload.find((p) => p.name === "yesPrice");
  const no = payload.find((p) => p.name === "noPrice");
  const vol = payload.find((p) => p.name === "volume");
  return (
    <div className="bg-popover border border-border rounded-lg p-3 shadow-lg text-xs space-y-1">
      <p className="text-muted-foreground font-mono">{label}</p>
      {yes && (
        <p className="text-bullish font-semibold font-mono">
          YES {yes.value}¢ <span className="text-muted-foreground font-normal">({yes.value}%)</span>
        </p>
      )}
      {no && (
        <p className="text-bearish font-semibold font-mono">
          NO {no.value}¢ <span className="text-muted-foreground font-normal">({no.value}%)</span>
        </p>
      )}
      {vol && vol.value > 0 && (
        <p className="text-muted-foreground font-mono">
          Vol: {vol.value.toLocaleString()}
        </p>
      )}
    </div>
  );
};

export function PriceChart({ marketId, currentYesPrice }: PriceChartProps) {
  const dispatch = useAppDispatch();
  const history = useAppSelector((s) => s.market.priceHistory);
  const [range, setRange] = useState<Range>("1D");
  const [isLoading, setIsLoading] = useState(false);
  const [chartType, setChartType] = useState<"area" | "candle">("area");

  const loadHistory = useCallback(
    async (r: Range) => {
      setIsLoading(true);
      await dispatch(fetchPriceHistory({ id: marketId, range: r }));
      setIsLoading(false);
    },
    [dispatch, marketId]
  );

  useEffect(() => {
    loadHistory(range);
  }, [range, loadHistory]);

  const chartData: ChartDataPoint[] = history.map((point) => ({
    time: formatTime(new Date(point.timestamp).getTime(), range),
    yesPrice: point.yesPrice,
    noPrice: 100 - point.yesPrice,
    volume: point.volume,
    timestamp: new Date(point.timestamp).getTime(),
  }));

  const latestPrice = chartData[chartData.length - 1]?.yesPrice ?? currentYesPrice ?? 50;
  const firstPrice = chartData[0]?.yesPrice ?? 50;
  const priceChange = latestPrice - firstPrice;
  const isPositive = priceChange >= 0;

  const gradientId = `yesGrad-${marketId}`;

  return (
    <div className="space-y-3">
      {/* ── Header ──────────────────────────────────────────────────── */}
      <div className="flex items-end justify-between">
        <div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono tabular-nums">
              {latestPrice}¢
            </span>
            <span className={`text-sm font-mono font-semibold ${isPositive ? "text-bullish" : "text-bearish"}`}>
              {isPositive ? "+" : ""}{priceChange.toFixed(1)}¢
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
            variant={chartType === "candle" ? "secondary" : "ghost"}
            className="h-7 text-xs"
            onClick={() => setChartType("candle")}
          >
            Vol
          </Button>
        </div>
      </div>

      {/* ── Time range selector ──────────────────────────────────────── */}
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

      {/* ── Chart ─────────────────────────────────────────────────────── */}
      <div className="h-48 w-full">
        {isLoading ? (
          <Skeleton className="h-full w-full" />
        ) : chartData.length === 0 ? (
          <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
            No price history yet
          </div>
        ) : chartType === "area" ? (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="oklch(0.65 0.18 145)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="oklch(0.65 0.18 145)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.5} />
              <XAxis
                dataKey="time"
                tick={{ fontSize: 10, fill: "var(--muted-foreground)", fontFamily: "var(--font-mono)" }}
                tickLine={false}
                axisLine={false}
                interval="preserveStartEnd"
              />
              <YAxis
                domain={[0, 100]}
                tick={{ fontSize: 10, fill: "var(--muted-foreground)", fontFamily: "var(--font-mono)" }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => `${v}¢`}
              />
              <Tooltip content={<CustomTooltip />} />
              <ReferenceLine y={50} stroke="var(--border)" strokeDasharray="4 4" strokeOpacity={0.6} />
              <Area
                type="monotone"
                dataKey="yesPrice"
                stroke="oklch(0.65 0.18 145)"
                strokeWidth={2}
                fill={`url(#${gradientId})`}
                dot={false}
                activeDot={{ r: 4, fill: "oklch(0.65 0.18 145)" }}
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.5} />
              <XAxis
                dataKey="time"
                tick={{ fontSize: 10, fill: "var(--muted-foreground)", fontFamily: "var(--font-mono)" }}
                tickLine={false}
                axisLine={false}
                interval="preserveStartEnd"
              />
              <YAxis
                yAxisId="price"
                domain={[0, 100]}
                tick={{ fontSize: 10, fill: "var(--muted-foreground)", fontFamily: "var(--font-mono)" }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => `${v}¢`}
              />
              <YAxis
                yAxisId="vol"
                orientation="right"
                tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar
                yAxisId="vol"
                dataKey="volume"
                fill="var(--muted)"
                opacity={0.6}
                radius={[2, 2, 0, 0]}
              />
              <Area
                yAxisId="price"
                type="monotone"
                dataKey="yesPrice"
                stroke="oklch(0.65 0.18 145)"
                strokeWidth={2}
                fill="none"
                dot={false}
              />
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* ── NO price overlay note ──────────────────────────────────── */}
      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <div className="w-3 h-0.5 bg-[oklch(0.65_0.18_145)] rounded" />
          YES {latestPrice}¢
        </span>
        <span className="flex items-center gap-1">
          <div className="w-3 h-0.5 bg-[oklch(0.58_0.22_17.5)] rounded" />
          NO {100 - latestPrice}¢
        </span>
        <span className="ml-auto font-mono">{chartData.length} data points</span>
      </div>
    </div>
  );
}