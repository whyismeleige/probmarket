"use client";
// components/markets/TradeForm.tsx
// Order placement form for limit/market orders

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { placeOrder, clearError } from "@/store/slices/orderSlice";
import { fetchWallet } from "@/store/slices/walletSlice";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";
import { Loader2, TrendingUp, TrendingDown, Info } from "lucide-react";
import type { Market } from "@/types";

interface TradeFormProps {
  market: Market;
  initialOutcome?: "YES" | "NO";
  initialPrice?: number;
  onSuccess?: () => void;
}

export function TradeForm({ market, initialOutcome = "YES", initialPrice, onSuccess }: TradeFormProps) {
  const dispatch = useAppDispatch();
  const { isPlacing, error, lastFills } = useAppSelector((s) => s.orders);
  const { wallet } = useAppSelector((s) => s.wallet);
  const { isAuthenticated } = useAppSelector((s) => s.auth);

  const [outcome, setOutcome] = useState<"YES" | "NO">(initialOutcome);
  const [side, setSide] = useState<"BUY" | "SELL">("BUY");
  const [orderType, setOrderType] = useState<"LIMIT" | "MARKET">("LIMIT");
  const [priceCents, setPriceCents] = useState<string>(
    initialPrice?.toString() ?? (initialOutcome === "YES" ? market.yesStats.lastPrice : market.noStats.lastPrice).toString()
  );
  const [quantity, setQuantity] = useState<string>("100");

  useEffect(() => {
    if (initialPrice) setPriceCents(initialPrice.toString());
  }, [initialPrice]);

  const price = parseInt(priceCents) || 0;
  const qty = parseInt(quantity) || 0;
  const totalCents = price * qty;
  const totalDollars = (totalCents / 100).toFixed(2);
  const maxProfit = side === "BUY" ? ((100 - price) * qty) / 100 : (price * qty) / 100;

  const canAfford =
    wallet ? wallet.availableBalanceCents >= totalCents : false;

  const isValid =
    isAuthenticated &&
    market.isOpen &&
    qty >= 1 &&
    (orderType === "MARKET" || (price >= 1 && price <= 99)) &&
    (side === "SELL" || canAfford);

  const handleSubmit = async () => {
    if (!isValid) return;
    dispatch(clearError());

    const result = await dispatch(
      placeOrder({
        marketId: market._id,
        outcome,
        side,
        type: orderType,
        priceCents: orderType === "LIMIT" ? price : undefined,
        quantity: qty,
      })
    );

    if (placeOrder.fulfilled.match(result)) {
      const fills = result.payload.fills;
      if (fills.length > 0) {
        toast.success(
          `✅ Filled ${fills.reduce((s, f) => s + f.quantity, 0)} shares @ avg ${
            Math.round(fills.reduce((s, f) => s + f.priceCents * f.quantity, 0) /
              fills.reduce((s, f) => s + f.quantity, 0))
          }¢`,
          { duration: 5000 }
        );
      } else {
        toast.success("📬 Order placed — waiting for match", { duration: 4000 });
      }
      dispatch(fetchWallet());
      onSuccess?.();
    } else if (placeOrder.rejected.match(result)) {
      toast.error(result.payload as string);
    }
  };

  const currentPrice = outcome === "YES" ? market.yesStats.lastPrice : market.noStats.lastPrice;

  return (
    <div className="space-y-4">
      {/* ── Outcome toggle ─────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={() => { setOutcome("YES"); setPriceCents(market.yesStats.lastPrice.toString()); }}
          className={cn(
            "flex flex-col items-center justify-center rounded-lg border-2 py-2.5 px-3 transition-all text-left",
            outcome === "YES"
              ? "border-[oklch(0.65_0.18_145)] bg-[oklch(0.65_0.18_145/0.1)]"
              : "border-border hover:border-[oklch(0.65_0.18_145/0.4)]"
          )}
        >
          <span className="flex items-center gap-1.5 text-sm font-semibold text-bullish">
            <TrendingUp className="size-3.5" />
            YES
          </span>
          <span className="text-lg font-bold font-mono tabular-nums">
            {market.yesStats.lastPrice}¢
          </span>
        </button>

        <button
          onClick={() => { setOutcome("NO"); setPriceCents(market.noStats.lastPrice.toString()); }}
          className={cn(
            "flex flex-col items-center justify-center rounded-lg border-2 py-2.5 px-3 transition-all text-left",
            outcome === "NO"
              ? "border-[oklch(0.58_0.22_17.5)] bg-[oklch(0.58_0.22_17.5/0.1)]"
              : "border-border hover:border-[oklch(0.58_0.22_17.5/0.4)]"
          )}
        >
          <span className="flex items-center gap-1.5 text-sm font-semibold text-bearish">
            <TrendingDown className="size-3.5" />
            NO
          </span>
          <span className="text-lg font-bold font-mono tabular-nums">
            {market.noStats.lastPrice}¢
          </span>
        </button>
      </div>

      {/* ── Buy / Sell tabs ───────────────────────────────────────── */}
      <Tabs value={side} onValueChange={(v) => setSide(v as "BUY" | "SELL")}>
        <TabsList className="w-full grid grid-cols-2">
          <TabsTrigger value="BUY" className="data-[state=active]:text-bullish">
            Buy
          </TabsTrigger>
          <TabsTrigger value="SELL" className="data-[state=active]:text-bearish">
            Sell
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* ── Order type ────────────────────────────────────────────── */}
      <div className="flex gap-2">
        {(["LIMIT", "MARKET"] as const).map((t) => (
          <Button
            key={t}
            size="sm"
            variant={orderType === t ? "secondary" : "ghost"}
            className="h-7 text-xs"
            onClick={() => setOrderType(t)}
          >
            {t}
          </Button>
        ))}
      </div>

      {/* ── Price input (LIMIT only) ──────────────────────────────── */}
      {orderType === "LIMIT" && (
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">
            PRICE (cents, 1–99)
          </Label>
          <div className="relative">
            <Input
              type="number"
              min={1}
              max={99}
              value={priceCents}
              onChange={(e) => setPriceCents(e.target.value)}
              className="pr-6"
              placeholder={`${currentPrice}`}
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground font-mono">
              ¢
            </span>
          </div>
          {price > 0 && (
            <p className="text-xs text-muted-foreground">
              Implies {price}% probability
            </p>
          )}
        </div>
      )}

      {/* ── Quantity input ────────────────────────────────────────── */}
      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">SHARES</Label>
        <Input
          type="number"
          min={1}
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
          placeholder="100"
        />
        {/* Quick amount buttons */}
        <div className="flex gap-1.5">
          {[10, 50, 100, 500].map((q) => (
            <button
              key={q}
              onClick={() => setQuantity(q.toString())}
              className="flex-1 text-[10px] font-mono py-0.5 rounded border border-border hover:bg-accent transition-colors"
            >
              {q}
            </button>
          ))}
        </div>
      </div>

      <Separator />

      {/* ── Order summary ─────────────────────────────────────────── */}
      <div className="space-y-1.5 text-xs font-mono">
        <div className="flex justify-between text-muted-foreground">
          <span>Cost</span>
          <span className="font-semibold text-foreground">${totalDollars}</span>
        </div>
        <div className="flex justify-between text-muted-foreground">
          <span>Max profit</span>
          <span className="text-bullish font-semibold">+${maxProfit.toFixed(2)}</span>
        </div>
        {wallet && side === "BUY" && (
          <div className="flex justify-between text-muted-foreground">
            <span>Available</span>
            <span className={cn(canAfford ? "text-foreground" : "text-bearish")}>
              ${(wallet.availableBalanceCents / 100).toFixed(2)}
            </span>
          </div>
        )}
      </div>

      {/* ── Submit button ─────────────────────────────────────────── */}
      {!isAuthenticated ? (
        <Button className="w-full" disabled>
          Login to trade
        </Button>
      ) : (
        <Button
          className="w-full"
          variant={outcome === "YES" ? "default" : "secondary"}
          size="lg"
          disabled={!isValid || isPlacing}
          onClick={handleSubmit}
        >
          {isPlacing ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            `${side} ${outcome} @ ${orderType === "LIMIT" ? `${price}¢` : "Market"}`
          )}
        </Button>
      )}

      {error && (
        <p className="text-xs text-bearish text-center">{error}</p>
      )}

      {!market.isOpen && (
        <p className="text-xs text-muted-foreground text-center flex items-center justify-center gap-1">
          <Info className="size-3" />
          This market is {market.status.toLowerCase()}
        </p>
      )}
    </div>
  );
}