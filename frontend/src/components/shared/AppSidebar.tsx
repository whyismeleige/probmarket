"use client";
// components/shared/AppSidebar.tsx

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useAppSelector, useAppDispatch } from "@/store/hooks";
import { logout } from "@/store/slices/authSlice";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard,
  TrendingUp,
  Wallet,
  BarChart3,
  LogOut,
  ChevronRight,
  Activity,
  ListOrdered,
  Zap,
  Menu,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import toast from "react-hot-toast";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/markets", label: "Markets", icon: TrendingUp },
  { href: "/stocks", label: "Live Stocks", icon: Zap, badge: "LIVE" },
  { href: "/portfolio", label: "Portfolio", icon: BarChart3 },
  { href: "/orders", label: "My Orders", icon: ListOrdered },
  { href: "/wallet", label: "Wallet", icon: Wallet },
];

export function AppSidebar() {
  const pathname = usePathname();
  const dispatch = useAppDispatch();
  const router = useRouter();
  const { user } = useAppSelector((s) => s.auth);
  const { wallet } = useAppSelector((s) => s.wallet);
  const { isConnected } = useAppSelector((s) => s.stocks);
  const [mobileOpen, setMobileOpen] = useState(false);

  // Close drawer on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  // Prevent body scroll when drawer is open
  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  const handleLogout = async () => {
    await dispatch(logout());
    toast.success("Logged out");
    router.push("/auth");
  };

  const SidebarContent = () => (
    <>
      {/* ── Logo ──────────────────────────────────────────────────── */}
      <div className="flex items-center gap-2.5 px-5 h-14 border-b border-sidebar-border shrink-0">
        <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-primary">
          <Activity className="size-4 text-primary-foreground" />
        </div>
        <span className="font-bold text-sm tracking-tight text-sidebar-primary">
          ProbMarket
        </span>
        <span className="ml-auto text-[10px] font-mono text-sidebar-foreground/50 bg-sidebar-accent/50 px-1.5 py-0.5 rounded">
          BETA
        </span>
        {/* Close button — mobile only */}
        <button
          className="lg:hidden ml-1 p-1 rounded-md text-sidebar-foreground/50 hover:text-sidebar-accent-foreground hover:bg-sidebar-accent/50 transition-colors"
          onClick={() => setMobileOpen(false)}
          aria-label="Close menu"
        >
          <X className="size-4" />
        </button>
      </div>

      {/* ── Wallet balance ────────────────────────────────────────── */}
      {wallet && (
        <div className="mx-3 mt-3 rounded-lg bg-sidebar-accent/60 border border-sidebar-border p-3">
          <p className="text-[10px] text-sidebar-foreground/60 uppercase tracking-wider mb-0.5">
            Available Balance
          </p>
          <p className="text-lg font-bold font-mono text-sidebar-accent-foreground">
            ${(wallet.availableBalanceCents / 100).toFixed(2)}
          </p>
          {wallet.reservedBalanceCents > 0 && (
            <p className="text-[10px] text-sidebar-foreground/50 font-mono">
              ${(wallet.reservedBalanceCents / 100).toFixed(2)} reserved
            </p>
          )}
        </div>
      )}

      {/* ── Navigation ────────────────────────────────────────────── */}
      <nav className="flex-1 px-3 py-3 space-y-0.5 overflow-y-auto">
        {navItems.map(({ href, label, icon: Icon, badge }) => {
          const isActive = pathname === href || pathname.startsWith(href + "/");
          const isLive = href === "/stocks";
          return (
            <Link key={href} href={href}>
              <div
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all duration-150 group",
                  isActive
                    ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                    : "text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
                )}
              >
                <Icon
                  className={cn(
                    "size-4 shrink-0",
                    isActive
                      ? "text-sidebar-accent-foreground"
                      : "text-sidebar-foreground/60 group-hover:text-sidebar-accent-foreground",
                    isLive && isConnected && "text-emerald-400"
                  )}
                />
                {label}
                {badge && (
                  <span
                    className={cn(
                      "ml-auto text-[9px] font-bold px-1.5 py-0.5 rounded-full",
                      isConnected
                        ? "bg-emerald-500/20 text-emerald-400 animate-pulse"
                        : "bg-muted text-muted-foreground"
                    )}
                  >
                    {badge}
                  </span>
                )}
                {isActive && !badge && (
                  <ChevronRight className="size-3 ml-auto" />
                )}
              </div>
            </Link>
          );
        })}
      </nav>

      {/* ── User section ──────────────────────────────────────────── */}
      <div className="px-3 pb-4 pt-2 border-t border-sidebar-border">
        <div className="flex items-center gap-2.5 px-2 py-2 rounded-lg">
          <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center text-xs font-bold text-primary-foreground shrink-0">
            {user?.displayName?.[0]?.toUpperCase() ?? "?"}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold truncate text-sidebar-accent-foreground">
              {user?.displayName}
            </p>
            <p className="text-[10px] text-sidebar-foreground/50 truncate">
              @{user?.username}
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="size-7 text-sidebar-foreground/50 hover:text-sidebar-accent-foreground hover:bg-sidebar-accent/50"
            onClick={handleLogout}
            title="Logout"
          >
            <LogOut className="size-3.5" />
          </Button>
        </div>
      </div>
    </>
  );

  return (
    <>
      {/* ── Mobile top bar ────────────────────────────────────────── */}
      <header className="lg:hidden fixed top-0 left-0 right-0 z-40 h-14 bg-sidebar border-b border-sidebar-border flex items-center px-4 gap-3">
        <button
          onClick={() => setMobileOpen(true)}
          className="p-1.5 rounded-lg text-sidebar-foreground/70 hover:text-sidebar-accent-foreground hover:bg-sidebar-accent/50 transition-colors"
          aria-label="Open menu"
        >
          <Menu className="size-5" />
        </button>
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center w-6 h-6 rounded-md bg-primary">
            <Activity className="size-3.5 text-primary-foreground" />
          </div>
          <span className="font-bold text-sm tracking-tight text-sidebar-primary">
            ProbMarket
          </span>
          <span className="text-[10px] font-mono text-sidebar-foreground/50 bg-sidebar-accent/50 px-1.5 py-0.5 rounded">
            BETA
          </span>
        </div>
        {/* Wallet quick-view on mobile */}
        {wallet && (
          <div className="ml-auto flex items-center gap-1 text-xs font-mono font-bold text-sidebar-accent-foreground">
            <Wallet className="size-3.5 text-sidebar-foreground/50" />
            ${(wallet.availableBalanceCents / 100).toFixed(2)}
          </div>
        )}
      </header>

      {/* ── Mobile drawer backdrop ────────────────────────────────── */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* ── Mobile slide-in drawer ────────────────────────────────── */}
      <aside
        className={cn(
          "lg:hidden fixed top-0 left-0 z-50 h-screen w-72 flex flex-col bg-sidebar border-r border-sidebar-border transition-transform duration-300 ease-in-out",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
        aria-hidden={!mobileOpen}
      >
        <SidebarContent />
      </aside>

      {/* ── Desktop sidebar (unchanged) ───────────────────────────── */}
      <aside className="hidden lg:flex w-60 flex-col h-screen sticky top-0 bg-sidebar border-r border-sidebar-border shrink-0">
        <SidebarContent />
      </aside>
    </>
  );
}