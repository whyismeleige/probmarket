"use client";
// app/(dashboard)/markets/page.tsx

import { useEffect, useState, useCallback } from "react";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { fetchMarkets } from "@/store/slices/marketSlice";
import { MarketCard } from "@/components/markets/MarketCard";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, SlidersHorizontal, Star } from "lucide-react";

const CATEGORIES = [
  "All",
  "Politics",
  "Sports",
  "Finance",
  "Technology",
  "Science",
  "Crypto",
  "World Events",
];

const STATUS_OPTIONS = [
  { value: "OPEN", label: "Open" },
  { value: "SUSPENDED", label: "Suspended" },
  { value: "RESOLVED", label: "Resolved" },
];

export default function MarketsPage() {
  const dispatch = useAppDispatch();
  const { markets, isLoading, pagination } = useAppSelector((s) => s.market);

  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [status, setStatus] = useState("OPEN");
  const [sort, setSort] = useState("createdAt");
  const [page, setPage] = useState(1);

  const loadMarkets = useCallback(() => {
    dispatch(
      fetchMarkets({
        search: search || undefined,
        category: category !== "All" ? category : undefined,
        status,
        sort,
        order: "desc",
        page,
        limit: 12,
      })
    );
  }, [dispatch, search, category, status, sort, page]);

  useEffect(() => {
    loadMarkets();
  }, [loadMarkets]);

  // Debounced search
  useEffect(() => {
    const t = setTimeout(() => loadMarkets(), 400);
    return () => clearTimeout(t);
  }, [search]);

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-5">
      {/* ── Header ──────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Prediction Markets</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {pagination?.total ?? 0} markets available
          </p>
        </div>
      </div>

      {/* ── Search + Filters ────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Search markets..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          {STATUS_OPTIONS.map((opt) => (
            <Button
              key={opt.value}
              size="sm"
              variant={status === opt.value ? "secondary" : "outline"}
              onClick={() => { setStatus(opt.value); setPage(1); }}
              className="h-9"
            >
              {opt.label}
            </Button>
          ))}
        </div>
      </div>

      {/* ── Category chips ──────────────────────────────────────── */}
      <div className="flex gap-2 flex-wrap">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => { setCategory(cat); setPage(1); }}
            className={`text-xs px-3 py-1.5 rounded-full border transition-all font-medium ${
              category === cat
                ? "bg-primary text-primary-foreground border-primary"
                : "border-border hover:border-primary/50 text-muted-foreground hover:text-foreground"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* ── Sort ────────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <SlidersHorizontal className="size-3.5" />
        <span>Sort by:</span>
        {[
          { value: "createdAt", label: "Newest" },
          { value: "totalVolumeCents", label: "Volume" },
          { value: "closesAt", label: "Expiring soon" },
        ].map((opt) => (
          <button
            key={opt.value}
            onClick={() => setSort(opt.value)}
            className={`px-2 py-0.5 rounded transition-colors ${
              sort === opt.value
                ? "text-foreground font-medium bg-accent"
                : "hover:text-foreground"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* ── Markets grid ────────────────────────────────────────── */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {Array.from({ length: 9 }).map((_, i) => (
            <Skeleton key={i} className="h-44 rounded-xl" />
          ))}
        </div>
      ) : markets.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <p className="text-muted-foreground">No markets found</p>
          <p className="text-sm text-muted-foreground/60 mt-1">
            Try a different search or category
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {markets.map((market) => (
            <MarketCard key={market._id} market={market} />
          ))}
        </div>
      )}

      {/* ── Pagination ──────────────────────────────────────────── */}
      {pagination && pagination.pages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page === 1}
            onClick={() => setPage((p) => p - 1)}
          >
            Previous
          </Button>
          <span className="text-sm text-muted-foreground font-mono">
            {page} / {pagination.pages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page === pagination.pages}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}