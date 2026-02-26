import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// ─── Trading utilities ─────────────────────────────────────────────────────

/** Convert cents (integer) to a dollar string: 6000 → "$60.00" */
export function centsToDisplay(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

/** Convert cents to a probability percentage string: 65 → "65%" */
export function centsToProb(cents: number): string {
  return `${cents}%`;
}

/** Format large numbers: 125000 → "125K", 1500000 → "1.5M" */
export function formatVolume(cents: number): string {
  const dollars = cents / 100;
  if (dollars >= 1_000_000) return `$${(dollars / 1_000_000).toFixed(1)}M`;
  if (dollars >= 1_000) return `$${(dollars / 1_000).toFixed(1)}K`;
  return `$${dollars.toFixed(0)}`;
}

/** Returns "text-bullish" or "text-bearish" depending on sign */
export function pnlClass(value: number): string {
  return value >= 0 ? "text-bullish" : "text-bearish";
}

/** Format P&L with + or - prefix */
export function formatPnl(cents: number): string {
  const dollars = cents / 100;
  const prefix = dollars >= 0 ? "+" : "";
  return `${prefix}$${Math.abs(dollars).toFixed(2)}`;
}

/** Returns time remaining string: "3d 4h", "45m", "Expired" */
export function timeRemaining(closesAt: string | Date): string {
  const diff = new Date(closesAt).getTime() - Date.now();
  if (diff <= 0) return "Expired";
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

/** Format a date/time: "Feb 25, 2:30 PM" */
export function formatDateTime(date: string | Date): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(date));
}