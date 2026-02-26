"use client";
// app/(dashboard)/orders/page.tsx

import { useEffect } from "react";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { fetchMyOrders, cancelOrder } from "@/store/slices/orderSlice";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { cn, formatDateTime } from "@/lib/utils";
import { X, Loader2 } from "lucide-react";
import Link from "next/link";
import toast from "react-hot-toast";
import type { Order } from "@/types";

export default function OrdersPage() {
  const dispatch = useAppDispatch();
  const { orders, isLoading: ordersIsLoading, isCancelling } = useAppSelector((s) => s.orders);

  useEffect(() => {
    dispatch(fetchMyOrders({ limit: 50 }));
  }, [dispatch]);

  const openOrders = orders.filter((o) =>
    ["OPEN", "PARTIALLY_FILLED"].includes(o.status)
  );
  const closedOrders = orders.filter((o) =>
    ["FILLED", "CANCELLED", "REJECTED"].includes(o.status)
  );

  const handleCancel = async (orderId: string) => {
    const result = await dispatch(cancelOrder(orderId));
    if (cancelOrder.fulfilled.match(result)) {
      toast.success("Order cancelled");
    } else {
      toast.error("Failed to cancel order");
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-5">
      <div>
        <h1 className="text-2xl font-bold">My Orders</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Manage your open and closed orders
        </p>
      </div>

      <Tabs defaultValue="open">
        <TabsList>
          <TabsTrigger value="open">
            Open <span className="ml-1.5 text-xs bg-primary/20 text-primary px-1.5 py-0.5 rounded-full">{openOrders.length}</span>
          </TabsTrigger>
          <TabsTrigger value="closed">
            History
          </TabsTrigger>
        </TabsList>

        <TabsContent value="open" className="mt-4 space-y-2">
          {ordersIsLoading ? (
            Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20" />)
          ) : openOrders.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <p>No open orders</p>
              <Link href="/markets">
                <Button variant="link" size="sm" className="mt-1">Browse markets</Button>
              </Link>
            </div>
          ) : (
            openOrders.map((order) => (
              <OrderRow
                key={order._id}
                order={order}
                onCancel={handleCancel}
                isCancelling={isCancelling === order._id}
              />
            ))
          )}
        </TabsContent>

        <TabsContent value="closed" className="mt-4 space-y-2">
          {ordersIsLoading ? (
            Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-16" />)
          ) : closedOrders.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">No order history</div>
          ) : (
            closedOrders.map((order) => (
              <OrderRow key={order._id} order={order} />
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function OrderRow({
  order,
  onCancel,
  isCancelling,
}: {
  order: Order;
  onCancel?: (id: string) => void;
  isCancelling?: boolean;
}) {
  const market = typeof order.marketId === "object" ? order.marketId : null;
  const canCancel = ["OPEN", "PARTIALLY_FILLED"].includes(order.status);

  return (
    <Card>
      <CardContent className="pt-4 pb-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0 space-y-1.5">
            {market && (
              <Link href={`/markets/${market._id}`}>
                <p className="text-sm font-medium hover:text-primary transition-colors line-clamp-1">
                  {market.title}
                </p>
              </Link>
            )}
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={order.side === "BUY" ? "default" : "secondary"} className="text-[10px]">
                {order.side}
              </Badge>
              <Badge variant={order.outcome === "YES" ? "default" : "secondary"} className="text-[10px]">
                {order.outcome}
              </Badge>
              <Badge variant="outline" className="text-[10px] font-mono">{order.type}</Badge>
              <span className="text-xs font-mono text-muted-foreground">
                {order.priceCents}¢ × {order.quantity}
              </span>
              {order.filledQuantity > 0 && (
                <span className="text-xs text-bullish font-mono">
                  {order.filledQuantity} filled
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <div className={cn(
              "text-xs px-2 py-0.5 rounded-full font-medium",
              order.status === "OPEN" && "bg-primary/10 text-primary",
              order.status === "PARTIALLY_FILLED" && "bg-chart-2/20 text-chart-2",
              order.status === "FILLED" && "bg-[oklch(0.65_0.18_145/0.15)] text-bullish",
              order.status === "CANCELLED" && "bg-muted text-muted-foreground",
            )}>
              {order.status.replace("_", " ")}
            </div>
            {canCancel && onCancel && (
              <Button
                variant="ghost"
                size="icon"
                className="size-7 text-muted-foreground hover:text-destructive"
                onClick={() => onCancel(order._id)}
                disabled={isCancelling}
              >
                {isCancelling
                  ? <Loader2 className="size-3.5 animate-spin" />
                  : <X className="size-3.5" />
                }
              </Button>
            )}
          </div>
        </div>

        <p className="text-[10px] text-muted-foreground font-mono mt-2">
          {formatDateTime(order.createdAt)}
        </p>
      </CardContent>
    </Card>
  );
}