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
} from "lucide-react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/markets", label: "Markets", icon: TrendingUp },
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

  const handleLogout = async () => {
    await dispatch(logout());
    toast.success("Logged out");
    router.push("/auth");
  };

  return (
    <aside className="hidden lg:flex w-60 flex-col h-screen sticky top-0 bg-sidebar border-r border-sidebar-border shrink-0">
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
        {navItems.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href || pathname.startsWith(href + "/");
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
                <Icon className={cn(
                  "size-4 shrink-0",
                  isActive ? "text-sidebar-accent-foreground" : "text-sidebar-foreground/60 group-hover:text-sidebar-accent-foreground"
                )} />
                {label}
                {isActive && (
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
    </aside>
  );
}