// types/index.ts — All TypeScript types for ProbMarket

// ─── User & Auth ──────────────────────────────────────────────────────────────
export interface User {
  _id: string;
  username: string;
  email: string;
  displayName: string;
  avatarUrl: string | null;
  role: "user" | "admin" | "moderator";
  wallet?: string;
  stats: {
    totalTrades: number;
    marketsTraded: number;
    profitLoss: number;
    winRate: number;
  };
  createdAt: string;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

// ─── Wallet ───────────────────────────────────────────────────────────────────
export interface Wallet {
  availableBalanceCents: number;
  reservedBalanceCents: number;
  totalBalanceCents: number;
  availableBalance: string;
  reservedBalance: string;
  totalBalance: string;
}

export interface WalletTransaction {
  _id: string;
  type:
    | "DEPOSIT"
    | "WITHDRAWAL"
    | "ORDER_RESERVE"
    | "ORDER_RELEASE"
    | "TRADE_CREDIT"
    | "TRADE_DEBIT"
    | "SETTLEMENT_CREDIT";
  amountCents: number;
  balanceAfterCents: number;
  referenceId?: string;
  description?: string;
  createdAt: string;
}

// ─── Market ───────────────────────────────────────────────────────────────────
export type MarketStatus = "DRAFT" | "OPEN" | "SUSPENDED" | "RESOLVED" | "CANCELLED";
export type MarketOutcome = "YES" | "NO";

export interface OutcomeStats {
  lastPrice: number;
  bestBid: number | null;
  bestAsk: number | null;
  volume24h: number;
  volumeTotal: number;
  openInterest: number;
}

export interface PricePoint {
  yesPrice: number;
  volume: number;
  timestamp: string;
}

export interface Market {
  _id: string;
  title: string;
  description: string;
  category: string;
  tags: string[];
  imageUrl: string | null;
  createdBy: { username: string; displayName: string } | string;
  status: MarketStatus;
  opensAt: string;
  closesAt: string;
  resolvedAt: string | null;
  resolutionCriteria: string;
  resolvedOutcome: MarketOutcome | null;
  yesStats: OutcomeStats;
  noStats: OutcomeStats;
  priceHistory: PricePoint[];
  liquidity: number;
  totalVolumeCents: number;
  uniqueTraders: number;
  featured: boolean;
  slug: string;
  isOpen: boolean;
  spread: number | null;
  createdAt: string;
  // Populated for logged-in users
  orderBook?: MarketOrderBookSnapshot;
  userPositions?: Position[];
  userOpenOrders?: Order[];
  recentTrades?: Trade[];
  liveStats?: {
    yesBestBid: number | null;
    yesBestAsk: number | null;
    noBestBid: number | null;
    noBestAsk: number | null;
  };
}

// ─── Order Book ───────────────────────────────────────────────────────────────
export interface OrderBookLevel {
  priceCents: number;
  totalQuantity: number;
  orderCount: number;
}

export interface HalfBookSnapshot {
  marketId: string;
  outcome: MarketOutcome;
  bids: OrderBookLevel[];
  asks: OrderBookLevel[];
  bestBid: number | null;
  bestAsk: number | null;
  spread: number | null;
  lastTradePriceCents: number | null;
  timestamp: number;
}

export interface MarketOrderBookSnapshot {
  YES: HalfBookSnapshot;
  NO: HalfBookSnapshot;
}

// ─── Order ────────────────────────────────────────────────────────────────────
export type OrderSide = "BUY" | "SELL";
export type OrderType = "LIMIT" | "MARKET";
export type OrderStatus =
  | "OPEN"
  | "PARTIALLY_FILLED"
  | "FILLED"
  | "CANCELLED"
  | "REJECTED";

export interface Order {
  _id: string;
  userId: string;
  marketId: string | { _id: string; title: string; category: string; status: MarketStatus; slug: string };
  outcome: MarketOutcome;
  side: OrderSide;
  type: OrderType;
  priceCents: number;
  quantity: number;
  filledQuantity: number;
  remainingQuantity: number;
  reservedCents: number;
  avgFillPriceCents: number | null;
  status: OrderStatus;
  closedAt: string | null;
  createdAt: string;
  fillPercent: number;
}

// ─── Trade / Fill ─────────────────────────────────────────────────────────────
export interface Trade {
  _id: string;
  marketId: string | { _id: string; title: string; category: string };
  takerOrderId: string;
  takerUserId: string;
  makerOrderId: string;
  makerUserId: string;
  outcome: MarketOutcome;
  priceCents: number;
  quantity: number;
  totalValueCents: number;
  executedAt: string;
}

// ─── Position ─────────────────────────────────────────────────────────────────
export interface Position {
  _id: string;
  userId: string;
  marketId: string | Market;
  outcome: MarketOutcome;
  quantity: number;
  avgCostCents: number;
  totalCostCents: number;
  settled: boolean;
  settledAt: string | null;
  settlementCreditCents: number;
  // Computed by controller
  currentPriceCents?: number;
  currentValueCents?: number;
  unrealizedPnlCents?: number;
  unrealizedPnlPercent?: string;
  createdAt: string;
}

export interface PositionSummary {
  totalPositions: number;
  totalInvestedCents: number;
  totalCurrentValueCents: number;
  totalUnrealizedPnlCents: number;
  totalInvested: string;
  totalCurrentValue: string;
  totalUnrealizedPnl: string;
}

// ─── API Response wrappers ────────────────────────────────────────────────────
export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data: T;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: {
    items?: T[];
    pagination: { page: number; limit: number; total: number; pages: number };
  };
}