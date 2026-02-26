"use client";
// app/(dashboard)/markets/[id]/page.tsx
// Main market trading view: chart + order book + trade form + recent trades

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { fetchMarket, clearSelectedMarket } from "@/store/slices/marketSlice";
import { useSocket } from "@/components/providers/SocketProvider";
import { OrderBook } from "@/components/markets/OrderBook";
import { PriceChart } from "@/components/markets/PriceChart";
import { TradeForm } from "@/components/markets/TradeForm";
import { RecentTrades } from "@/components/markets/RecentTrades";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { formatVolume, timeRemaining, formatDateTime } from "@/lib/utils";
import {
  Clock,
  Users,
  TrendingUp,
  Info,
  ChevronLeft,
  BookOpen,
  BarChart3,
  ArrowUpDown,
} from "lucide-react";
import Link from "next/link";

export default function MarketDetailPage() {
  const { id } = useParams<{ id: string }>();
  const dispatch = useAppDispatch();
  const { subscribeMarket, unsubscribeMarket } = useSocket();

  const { selectedMarket: market, isLoadingMarket, liveOrderBook } = useAppSelector((s) => s.market);

  const [clickedPrice, setClickedPrice] = useState<number | undefined>();

  useEffect(() => {
    if (id) {
      dispatch(fetchMarket(id));
      subscribeMarket(id);
    }
    return () => {
      if (id) {
        unsubscribeMarket(id);
        dispatch(clearSelectedMarket());
      }
    };
  }, [id, dispatch, subscribeMarket, unsubscribeMarket]);

  const handlePriceClick = (priceCents: number, _side: "BUY" | "SELL") => {
    setClickedPrice(priceCents);
  };

  if (isLoadingMarket || !market) {
    return (
      <div className="p-6 max-w-7xl mx-auto space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-6 w-full max-w-2xl" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-4">
          <Skeleton className="lg:col-span-2 h-80" />
          <Skeleton className="h-80" />
        </div>
      </div>
    );
  }

  const yesPrice = market.yesStats?.lastPrice ?? 50;
  const noPrice = market.noStats?.lastPrice ?? 50;

  return (
    <div className="p-4 lg:p-6 max-w-7xl mx-auto space-y-4">
      {/* ── Breadcrumb ────────────────────────────────────────── */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/markets">
          <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs">
            <ChevronLeft className="size-3" /> Markets
          </Button>
        </Link>
        <span>/</span>
        <span className="text-foreground truncate max-w-[300px]">{market.title}</span>
      </div>

      {/* ── Market header ──────────────────────────────────────── */}
      <div className="space-y-2">
        <div className="flex items-start gap-3">
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold leading-snug">{market.title}</h1>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Badge
              variant={
                market.status === "OPEN"
                  ? "default"
                  : market.status === "RESOLVED"
                  ? "secondary"
                  : "destructive"
              }
            >
              {market.status}
            </Badge>
            <Badge variant="outline">{market.category}</Badge>
          </div>
        </div>

        {/* Resolved outcome banner */}
        {market.status === "RESOLVED" && market.resolvedOutcome && (
          <div className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-semibold text-sm ${
            market.resolvedOutcome === "YES"
              ? "bg-[oklch(0.65_0.18_145/0.15)] text-bullish border border-[oklch(0.65_0.18_145/0.3)]"
              : "bg-[oklch(0.58_0.22_17.5/0.15)] text-bearish border border-[oklch(0.58_0.22_17.5/0.3)]"
          }`}>
            🏁 Resolved: {market.resolvedOutcome}
            {market.resolvedAt && (
              <span className="font-normal text-muted-foreground ml-1">
                on {formatDateTime(market.resolvedAt)}
              </span>
            )}
          </div>
        )}

        {/* Stats row */}
        <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <TrendingUp className="size-3.5" />
            {formatVolume(market.totalVolumeCents)} volume
          </span>
          <span className="flex items-center gap-1.5">
            <Users className="size-3.5" />
            {market.uniqueTraders} traders
          </span>
          <span className="flex items-center gap-1.5">
            <Clock className="size-3.5" />
            {market.status === "OPEN" ? `Closes in ${timeRemaining(market.closesAt)}` : formatDateTime(market.closesAt)}
          </span>
        </div>
      </div>

      {/* ── Main layout: chart + sidebar ─────────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_340px] gap-4">
        {/* Left column */}
        <div className="space-y-4">
          {/* Price chart */}
          <Card>
            <CardContent className="pt-4">
              <PriceChart marketId={market._id} currentYesPrice={yesPrice} />
            </CardContent>
          </Card>

          {/* Order book + recent trades tabs */}
          <Card>
            <CardContent className="pt-4">
              <Tabs defaultValue="orderbook">
                <TabsList className="mb-4">
                  <TabsTrigger value="orderbook" className="gap-1.5 text-xs">
                    <BookOpen className="size-3.5" /> Order Book
                  </TabsTrigger>
                  <TabsTrigger value="trades" className="gap-1.5 text-xs">
                    <ArrowUpDown className="size-3.5" /> Recent Trades
                  </TabsTrigger>
                  <TabsTrigger value="info" className="gap-1.5 text-xs">
                    <Info className="size-3.5" /> Info
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="orderbook">
                  <OrderBook
                    orderBook={liveOrderBook ?? market.orderBook ?? null}
                    onPriceClick={handlePriceClick}
                  />
                </TabsContent>

                <TabsContent value="trades">
                  <RecentTrades trades={market.recentTrades ?? []} />
                </TabsContent>

                <TabsContent value="info">
                  <div className="space-y-3 text-sm">
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                        Description
                      </p>
                      <p className="text-muted-foreground leading-relaxed">{market.description}</p>
                    </div>
                    <Separator />
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                        Resolution Criteria
                      </p>
                      <p className="text-muted-foreground leading-relaxed">{market.resolutionCriteria}</p>
                    </div>
                    {market.tags?.length > 0 && (
                      <>
                        <Separator />
                        <div className="flex flex-wrap gap-1.5">
                          {market.tags.map((tag) => (
                            <Badge key={tag} variant="outline" className="text-[10px]">
                              #{tag}
                            </Badge>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          {/* User's open orders for this market */}
          {market.userOpenOrders && market.userOpenOrders.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Your Open Orders</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {market.userOpenOrders.map((order) => (
                    <UserOrderRow key={order._id} order={order} />
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right column — Trade form */}
        <div className="space-y-4">
          <Card className="sticky top-4">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <BarChart3 className="size-4" />
                Place Order
              </CardTitle>
            </CardHeader>
            <CardContent>
              <TradeForm
                market={market}
                initialPrice={clickedPrice}
                onSuccess={() => {
                  dispatch(fetchMarket(market._id));
                }}
              />
            </CardContent>
          </Card>

          {/* User's positions */}
          {market.userPositions && market.userPositions.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Your Positions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {market.userPositions.map((pos) => (
                    <div
                      key={pos._id}
                      className="flex items-center justify-between text-sm"
                    >
                      <div>
                        <span className={pos.outcome === "YES" ? "text-bullish font-semibold" : "text-bearish font-semibold"}>
                          {pos.outcome}
                        </span>
                        <span className="text-muted-foreground ml-2 font-mono text-xs">
                          {pos.quantity} shares @ {pos.avgCostCents}¢
                        </span>
                      </div>
                      <div className="text-right">
                        <p className="font-mono text-xs">
                          ${(pos.totalCostCents / 100).toFixed(2)}
                        </p>
                      </div>
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

function UserOrderRow({ order }: { order: import("@/types").Order }) {
  return (
    <div className="flex items-center justify-between text-xs border border-border rounded-lg px-3 py-2">
      <div className="flex items-center gap-2">
        <Badge variant={order.side === "BUY" ? "default" : "secondary"} className="text-[10px]">
          {order.side}
        </Badge>
        <span className={order.outcome === "YES" ? "text-bullish font-semibold" : "text-bearish font-semibold"}>
          {order.outcome}
        </span>
      </div>
      <div className="flex items-center gap-3 font-mono text-muted-foreground">
        <span>{order.priceCents}¢</span>
        <span>{order.remainingQuantity}/{order.quantity}</span>
        <Badge variant="outline" className="text-[10px]">{order.status}</Badge>
      </div>
    </div>
  );
}