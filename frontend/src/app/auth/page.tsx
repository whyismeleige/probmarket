"use client";
// app/auth/page.tsx

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { login, register, clearError } from "@/store/slices/authSlice";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";
import { Activity, Loader2, TrendingUp, TrendingDown, Eye, EyeOff } from "lucide-react";

export default function AuthPage() {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const { isAuthenticated, isLoading, error } = useAppSelector((s) => s.auth);

  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [form, setForm] = useState({
    username: "",
    email: "",
    password: "",
    displayName: "",
  });

  useEffect(() => {
    if (isAuthenticated) router.push("/dashboard");
  }, [isAuthenticated, router]);

  useEffect(() => {
    dispatch(clearError());
  }, [isLogin, dispatch]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLogin) {
      const result = await dispatch(login({ email: form.email, password: form.password }));
      if (login.fulfilled.match(result)) {
        toast.success("Welcome back!");
        router.push("/dashboard");
      }
    } else {
      const result = await dispatch(register(form));
      if (register.fulfilled.match(result)) {
        toast.success("Account created! Welcome to ProbMarket 🎉");
        router.push("/dashboard");
      }
    }
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* ── Left panel — branding ──────────────────────────────── */}
      <div className="hidden lg:flex w-1/2 bg-sidebar flex-col justify-between p-10 relative overflow-hidden">
        {/* Background decoration */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute -top-20 -right-20 w-80 h-80 rounded-full bg-primary/5 blur-3xl" />
          <div className="absolute -bottom-20 -left-20 w-80 h-80 rounded-full bg-chart-2/5 blur-3xl" />
        </div>

        <div className="relative">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-primary">
              <Activity className="size-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold text-sidebar-accent-foreground">ProbMarket</span>
          </div>
        </div>

        <div className="relative space-y-6">
          <h1 className="text-4xl font-bold leading-tight text-sidebar-accent-foreground">
            Trade on what
            <br />
            <span className="text-primary">you know</span>
            <br />
            to be true.
          </h1>
          <p className="text-sidebar-foreground text-base leading-relaxed max-w-sm">
            A professional prediction market platform with real order books, live matching, and binary outcome markets on world events.
          </p>

          {/* Mock market cards */}
          <div className="space-y-2 pt-2">
            <MockMarketPill title="Will Bitcoin reach $150K?" yesPct={62} />
            <MockMarketPill title="Will India win T20 World Cup?" yesPct={48} />
            <MockMarketPill title="SpaceX Starship orbital flight 2025?" yesPct={73} />
          </div>
        </div>

        <div className="relative text-xs text-sidebar-foreground/40">
          © 2025 ProbMarket — Final Year Engineering Project
        </div>
      </div>

      {/* ── Right panel — form ────────────────────────────────── */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-sm space-y-6">
          {/* Mobile logo */}
          <div className="flex items-center gap-2 lg:hidden">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary">
              <Activity className="size-4 text-primary-foreground" />
            </div>
            <span className="font-bold text-lg">ProbMarket</span>
          </div>

          {/* Toggle */}
          <div>
            <h2 className="text-2xl font-bold">
              {isLogin ? "Sign in" : "Create account"}
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              {isLogin ? "New to ProbMarket?" : "Already have an account?"}{" "}
              <button
                onClick={() => setIsLogin(!isLogin)}
                className="text-primary hover:underline font-medium"
              >
                {isLogin ? "Create account" : "Sign in"}
              </button>
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="username" className="text-xs">Username</Label>
                  <Input
                    id="username"
                    name="username"
                    value={form.username}
                    onChange={handleChange}
                    placeholder="trader123"
                    required={!isLogin}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="displayName" className="text-xs">Display Name</Label>
                  <Input
                    id="displayName"
                    name="displayName"
                    value={form.displayName}
                    onChange={handleChange}
                    placeholder="John D."
                  />
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-xs">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                value={form.email}
                onChange={handleChange}
                placeholder="you@example.com"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-xs">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  value={form.password}
                  onChange={handleChange}
                  placeholder={isLogin ? "Your password" : "Min 8 chars, 1 uppercase, 1 number"}
                  required
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="rounded-lg bg-destructive/10 border border-destructive/20 px-3 py-2 text-sm text-destructive">
                {error}
              </div>
            )}

            <Button
              type="submit"
              className="w-full"
              size="lg"
              disabled={isLoading}
            >
              {isLoading ? (
                <Loader2 className="size-4 animate-spin" />
              ) : isLogin ? (
                "Sign in"
              ) : (
                "Create account & get $10,000"
              )}
            </Button>
          </form>

          {isLogin && (
            <div className="text-center">
              <p className="text-xs text-muted-foreground">
                Demo: <span className="font-mono">trader1@probmarket.com</span> / <span className="font-mono">Password@123</span>
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function MockMarketPill({ title, yesPct }: { title: string; yesPct: number }) {
  return (
    <div className="flex items-center justify-between bg-sidebar-accent/40 border border-sidebar-border rounded-lg px-3 py-2">
      <span className="text-xs text-sidebar-accent-foreground/80 flex-1 mr-3 truncate">{title}</span>
      <div className="flex items-center gap-2 shrink-0">
        <span className="text-xs font-mono font-semibold text-[oklch(0.65_0.18_145)]">
          {yesPct}¢
        </span>
        <TrendingUp className="size-3 text-[oklch(0.65_0.18_145)]" />
      </div>
    </div>
  );
}