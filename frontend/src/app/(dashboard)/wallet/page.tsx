"use client";
// app/(dashboard)/wallet/page.tsx

import { useEffect, useState } from "react";
import { useAppSelector, useAppDispatch } from "@/store/hooks";
import { fetchWallet } from "@/store/slices/walletSlice";
import { walletApi } from "@/lib/api/orders.api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { Wallet2, ArrowUpRight, ArrowDownLeft, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { WalletTransaction } from "@/types";

const TX_TYPE_LABELS: Record<string, string> = {
  DEPOSIT: "Deposit",
  WITHDRAWAL: "Withdrawal",
  ORDER_RESERVE: "Order Reserved",
  ORDER_RELEASE: "Order Released",
  TRADE_CREDIT: "Trade Proceeds",
  TRADE_DEBIT: "Trade Cost",
  SETTLEMENT_CREDIT: "Settlement Payout",
};

const TX_COLORS: Record<string, string> = {
  DEPOSIT: "text-bullish",
  TRADE_CREDIT: "text-bullish",
  ORDER_RELEASE: "text-bullish",
  SETTLEMENT_CREDIT: "text-bullish",
  WITHDRAWAL: "text-bearish",
  ORDER_RESERVE: "text-muted-foreground",
  TRADE_DEBIT: "text-bearish",
};

export default function WalletPage() {
  const dispatch = useAppDispatch();
  const { wallet, isLoading } = useAppSelector((s) => s.wallet);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [txLoading, setTxLoading] = useState(true);
  const [txPage, setTxPage] = useState(1);

  useEffect(() => {
    dispatch(fetchWallet());
  }, [dispatch]);

  useEffect(() => {
    setTxLoading(true);
    walletApi.getTransactions({ page: txPage, limit: 30 })
      .then((res) => setTransactions(res.data.data.transactions))
      .finally(() => setTxLoading(false));
  }, [txPage]);

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Wallet</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Your balance and transaction history</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => dispatch(fetchWallet())}
          className="gap-2"
        >
          <RefreshCw className="size-3.5" />
          Refresh
        </Button>
      </div>

      {/* ── Balance cards ─────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="sm:col-span-1">
          <CardContent className="pt-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Wallet2 className="size-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total Balance</p>
                {isLoading ? (
                  <Skeleton className="h-7 w-28 mt-1" />
                ) : (
                  <p className="text-2xl font-bold font-mono">
                    ${wallet?.totalBalance ?? "0.00"}
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-5">
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Available</p>
            {isLoading ? (
              <Skeleton className="h-8 w-32" />
            ) : (
              <>
                <p className="text-xl font-bold font-mono text-bullish">
                  ${wallet?.availableBalance ?? "0.00"}
                </p>
                <p className="text-xs text-muted-foreground mt-1">Ready to trade</p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-5">
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Reserved</p>
            {isLoading ? (
              <Skeleton className="h-8 w-32" />
            ) : (
              <>
                <p className="text-xl font-bold font-mono text-muted-foreground">
                  ${wallet?.reservedBalance ?? "0.00"}
                </p>
                <p className="text-xs text-muted-foreground mt-1">Locked in open orders</p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Transaction history ────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Transaction History</CardTitle>
        </CardHeader>
        <CardContent>
          {txLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : transactions.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No transactions yet
            </p>
          ) : (
            <div className="space-y-1">
              {transactions.map((tx, i) => {
                const isCredit = tx.amountCents > 0;
                return (
                  <div key={tx._id ?? i}>
                    <div className="flex items-center justify-between py-2.5">
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "p-1.5 rounded-full",
                          isCredit ? "bg-[oklch(0.65_0.18_145/0.15)]" : "bg-[oklch(0.58_0.22_17.5/0.15)]"
                        )}>
                          {isCredit
                            ? <ArrowDownLeft className="size-3.5 text-bullish" />
                            : <ArrowUpRight className="size-3.5 text-bearish" />
                          }
                        </div>
                        <div>
                          <p className="text-sm font-medium">
                            {TX_TYPE_LABELS[tx.type] ?? tx.type}
                          </p>
                          {tx.description && (
                            <p className="text-xs text-muted-foreground line-clamp-1">
                              {tx.description}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={cn(
                          "font-mono font-semibold text-sm",
                          TX_COLORS[tx.type] ?? "text-foreground"
                        )}>
                          {isCredit ? "+" : ""}${Math.abs(tx.amountCents / 100).toFixed(2)}
                        </p>
                        <p className="text-[10px] text-muted-foreground font-mono">
                          bal ${(tx.balanceAfterCents / 100).toFixed(2)}
                        </p>
                      </div>
                    </div>
                    {i < transactions.length - 1 && <Separator />}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}