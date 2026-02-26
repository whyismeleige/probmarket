// app/page.tsx
// ProbMarket Landing Page — Tailwind CSS + shadcn/ui + globals.css design tokens

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Activity,
  BookOpen,
  BarChart3,
  Zap,
  PieChart,
  ArrowRight,
} from "lucide-react";

// ─── Static data ──────────────────────────────────────────────────────────────

const TICKER_ITEMS = [
  { sym: "NVDA",  price: "875.20", ch: "+2.4%", up: true  },
  { sym: "AAPL",  price: "191.45", ch: "-0.8%", up: false },
  { sym: "TSLA",  price: "247.10", ch: "+1.9%", up: true  },
  { sym: "MSFT",  price: "415.30", ch: "+0.6%", up: true  },
  { sym: "BTC",   price: "67,420", ch: "+3.1%", up: true  },
  { sym: "META",  price: "512.80", ch: "-1.2%", up: false },
  { sym: "JPM",   price: "204.55", ch: "+0.4%", up: true  },
  { sym: "GOOGL", price: "178.60", ch: "-0.3%", up: false },
  { sym: "AMD",   price: "163.40", ch: "+2.7%", up: true  },
  { sym: "NFLX",  price: "638.45", ch: "+1.1%", up: true  },
];

const MARKETS = [
  { q: "Will Bitcoin reach $100K before end of 2025?",    yes: 71, cat: "Crypto"  },
  { q: "Will India win the ICC T20 World Cup 2026?",       yes: 58, cat: "Sports"  },
  { q: "Will the Fed cut rates more than twice in 2025?",  yes: 44, cat: "Finance" },
  { q: "Will Tesla's FSD reach Level 4 autonomy?",         yes: 37, cat: "Tech"    },
  { q: "Will Anthropic release Claude 5 before mid-2026?", yes: 63, cat: "AI"      },
  { q: "Will India's GDP exceed 7% in FY 2025-26?",       yes: 52, cat: "Economy" },
];

const HOW_STEPS = [
  { num: "01", icon: "💳", title: "Fund your account", desc: "Deposit funds instantly. Your balance is held safely and you can withdraw at any time with no lock-up period." },
  { num: "02", icon: "🔍", title: "Pick a market",     desc: "Browse hundreds of markets across politics, finance, sports, and tech. Every market has a clear resolution criteria." },
  { num: "03", icon: "⚡", title: "Place your order",  desc: "Buy YES or NO shares at any price between 1¢ and 99¢. When the event resolves, winning shares pay out $1.00 each." },
];

const FEATURES = [
  { Icon: BookOpen,  title: "Real order books",       desc: "Full limit order book with live bid/ask spreads. Place limit or market orders just like a real exchange." },
  { Icon: Zap,       title: "Live stock simulator",   desc: "Watch 20+ simulated stocks update every 2 seconds with realistic bull/bear cycle simulation and sparkline charts." },
  { Icon: BarChart3, title: "Price history & charts", desc: "Full candlestick and area charts for every market. Track probability shifts over time with multiple timeframes." },
  { Icon: PieChart,  title: "Portfolio & P&L",        desc: "See your open positions, realized PnL, and full trade history in one clean dashboard view." },
];

const TERMINAL_ROWS = [
  { sym: "NVDA",  name: "NVIDIA",   price: "$875.20", change: "+2.4%", up: true,  yes: 71 },
  { sym: "TSLA",  name: "Tesla",    price: "$247.10", change: "+1.9%", up: true,  yes: 58 },
  { sym: "META",  name: "Meta",     price: "$512.80", change: "-1.2%", up: false, yes: 44 },
  { sym: "GOOGL", name: "Alphabet", price: "$178.60", change: "-0.3%", up: false, yes: 37 },
  { sym: "AAPL",  name: "Apple",    price: "$191.45", change: "+0.5%", up: true,  yes: 63 },
];


// ─── Page ─────────────────────────────────────────────────────────────────────

export default function LandingPage() {
  // 3× duplicate for seamless ticker-track loop (translates -33.333%)
  const tickerItems = [...TICKER_ITEMS, ...TICKER_ITEMS, ...TICKER_ITEMS];

  return (
    <>
      {/* ── Scoped styles: Google Fonts + font utilities + entrance animations ── */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=JetBrains+Mono:wght@400;500;600;700&family=Outfit:wght@300;400;500;600&display=swap');

        /* Font utilities */
        .lp-display { font-family: 'DM Serif Display', serif; line-height: 1.05; letter-spacing: -0.02em; }
        .lp-mono    { font-family: 'JetBrains Mono', monospace; }
        .lp-body    { font-family: 'Outfit', sans-serif; }

        /* Gold gradient text — needs -webkit-text-fill-color, not expressible in Tailwind */
        .gold-text {
          background: linear-gradient(135deg, #C9A84C, #E8C86A);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        /* Gradient foreground text for stat values */
        .dim-text {
          background: linear-gradient(160deg, hsl(var(--foreground)), hsl(var(--foreground) / 0.5));
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        /* Film-grain overlay */
        .grain::before {
          content: '';
          position: fixed;
          inset: 0;
          pointer-events: none;
          z-index: 0;
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.04'/%3E%3C/svg%3E");
          opacity: 0.3;
        }

        /* Staggered hero entrance */
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .fu-1 { animation: fadeUp 0.65s 0.05s ease both; }
        .fu-2 { animation: fadeUp 0.65s 0.14s ease both; }
        .fu-3 { animation: fadeUp 0.65s 0.23s ease both; }
        .fu-4 { animation: fadeUp 0.65s 0.32s ease both; }
        .fu-5 { animation: fadeUp 0.65s 0.41s ease both; }
        .fu-6 { animation: fadeUp 0.65s 0.50s ease both; }

        /* Live dot pulse */
        @keyframes livePulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50%       { opacity: 0.4; transform: scale(0.72); }
        }
        .live-dot { animation: livePulse 2s ease-in-out infinite; }

        /* How-it-works gold top accent on hover */
        .how-card::before {
          content: '';
          position: absolute;
          top: 0; left: 0; right: 0;
          height: 2px;
          background: linear-gradient(90deg, #C9A84C, #E8C86A, transparent);
          opacity: 0;
          transition: opacity 0.3s ease;
          pointer-events: none;
        }
        .how-card:hover::before { opacity: 1; }

        /* Cursor blink for terminal */
        @keyframes blink { 0%, 100% { opacity: 0.9; } 50% { opacity: 0; } }
        .cursor-blink { animation: blink 1.1s step-end infinite; }
      `}</style>

      {/* Force dark-mode so all globals.css dark vars activate */}
      <div className="dark grain lp-body">
        <div className="relative min-h-screen bg-background text-foreground overflow-x-hidden">

          {/* ══════════════════════════════════════════════════════════
              NAV
          ══════════════════════════════════════════════════════════ */}
          <header className="fixed top-0 inset-x-0 z-50 h-16 flex items-center justify-between px-6 lg:px-12 border-b border-border backdrop-blur-xl bg-background/80">

            {/* Logo */}
            <a href="/" className="flex items-center gap-2.5 no-underline group">
              <div className="w-7 h-7 rounded-[8px] flex items-center justify-center shrink-0"
                style={{ background: 'linear-gradient(135deg, #C9A84C, #E8C86A)' }}>
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                  <path d="M8 1L14 5V11L8 15L2 11V5L8 1Z" stroke="#09090B" strokeWidth="1.5" strokeLinejoin="round"/>
                  <path d="M5 8.5L7 10.5L11 6.5" stroke="#09090B" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <span className="lp-display text-[1.15rem] text-foreground">ProbMarket</span>
            </a>

            {/* Nav links */}
            <nav className="hidden md:flex items-center gap-8">
              {[["#how","How it works"],["#markets","Markets"],["#features","Features"]].map(([href, label]) => (
                <a key={href} href={href}
                  className="text-[0.73rem] font-medium text-muted-foreground hover:text-foreground uppercase tracking-[0.09em] transition-colors duration-200 no-underline">
                  {label}
                </a>
              ))}
            </nav>

            {/* CTA */}
            <div className="flex items-center gap-2">
              <Button asChild variant="ghost"
                className="text-muted-foreground hover:text-foreground hover:bg-white/[0.04] text-xs font-medium uppercase tracking-wider h-9">
                <Link href="/auth">Log in</Link>
              </Button>
              <Button asChild
                className="h-9 px-5 text-[0.8rem] font-semibold text-[#09090B] border-0 rounded-lg
                           transition-all duration-250 hover:-translate-y-px hover:shadow-[0_4px_20px_rgba(201,168,76,0.45)]"
                style={{ background: 'linear-gradient(135deg, #C9A84C, #E8C86A)' }}>
                <Link href="/auth">Get started →</Link>
              </Button>
            </div>
          </header>

          {/* ══════════════════════════════════════════════════════════
              LIVE TICKER BAR
          ══════════════════════════════════════════════════════════ */}
          <div className="relative h-[38px] bg-card border-b border-border overflow-hidden flex items-center mt-16">
            {/* Edge fade — left */}
            <div className="absolute left-0 top-0 bottom-0 w-20 z-10 pointer-events-none"
              style={{ background: 'linear-gradient(to right, oklch(0.17 0 0), transparent)' }} />

            {/* Scrolling strip — uses ticker-track + ticker-scroll from globals.css */}
            <div className="ticker-track">
              {tickerItems.map((item, i) => (
                <div key={i}
                  className="flex items-center gap-2 px-5 border-r border-border lp-mono text-[0.68rem] whitespace-nowrap shrink-0">
                  <span className="font-bold text-foreground">{item.sym}</span>
                  <span className="text-muted-foreground">${item.price}</span>
                  <span className={item.up ? "text-bullish" : "text-bearish"}>
                    {item.up ? "▲" : "▼"} {item.ch}
                  </span>
                </div>
              ))}
            </div>

            {/* Edge fade — right */}
            <div className="absolute right-0 top-0 bottom-0 w-20 z-10 pointer-events-none"
              style={{ background: 'linear-gradient(to left, oklch(0.17 0 0), transparent)' }} />
          </div>

          {/* ══════════════════════════════════════════════════════════
              HERO
          ══════════════════════════════════════════════════════════ */}
          <section id="hero" className="relative flex flex-col items-center justify-center min-h-[calc(100vh-6.25rem)] py-24 px-4 overflow-hidden">

            {/* Ambient radial glow */}
            <div className="absolute inset-0 pointer-events-none"
              style={{ background: 'radial-gradient(ellipse 900px 580px at 50% -5%, rgba(201,168,76,0.085), transparent)' }} />

            {/* Dot-grid */}
            <div className="absolute inset-0 pointer-events-none opacity-[0.028]"
              style={{
                backgroundImage: 'linear-gradient(hsl(var(--foreground)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--foreground)) 1px, transparent 1px)',
                backgroundSize: '60px 60px',
                maskImage: 'radial-gradient(ellipse 80% 55% at 50% 40%, black, transparent)',
              }} />

            {/* Horizontal gold dividing line */}
            <div className="absolute inset-x-0 pointer-events-none" style={{ top: '68%', height: '1px' }}>
              <div className="w-full h-full"
                style={{ background: 'linear-gradient(90deg, transparent 0%, rgba(201,168,76,0.18) 35%, rgba(201,168,76,0.18) 65%, transparent 100%)' }} />
            </div>

            {/* ── Eyebrow ── */}
            <div className="fu-1 relative z-10 mb-7">
              <Badge variant="outline"
                className="rounded-full px-4 py-1.5 text-[0.68rem] font-semibold uppercase tracking-[0.1em]
                           border-[#C9A84C]/30 bg-[#C9A84C]/10 text-[#E8C86A] gap-2 h-auto">
                <span className="live-dot w-1.5 h-1.5 rounded-full bg-bullish" />
                Live prediction markets
              </Badge>
            </div>

            {/* ── H1 ── */}
            <h1 className="fu-2 lp-display relative z-10 text-center max-w-[900px] text-foreground"
              style={{ fontSize: 'clamp(3.4rem, 8vw, 7.2rem)' }}>
              Trade the future.<br />
              <span className="gold-text italic">Profit from certainty.</span>
            </h1>

            {/* ── Sub ── */}
            <p className="fu-3 relative z-10 mt-6 text-center max-w-[500px] text-muted-foreground leading-[1.75] font-light"
              style={{ fontSize: 'clamp(0.95rem, 1.5vw, 1.1rem)' }}>
              ProbMarket is a{" "}
              <span className="text-foreground/80 font-medium">real-time prediction market platform</span>{" "}
              where you trade on the probability of world events — with real order books,
              live pricing, and instant settlement.
            </p>

            {/* ── Buttons ── */}
            <div className="fu-4 relative z-10 flex items-center gap-3 mt-9 flex-wrap justify-center">
              <Button asChild size="lg"
                className="text-[0.95rem] font-semibold text-[#09090B] border-0 px-9 h-12 rounded-xl
                           transition-all duration-250 hover:-translate-y-0.5 hover:shadow-[0_8px_32px_rgba(201,168,76,0.42)]"
                style={{ background: 'linear-gradient(135deg, #C9A84C, #E8C86A)' }}>
                <Link href="/auth">Start trading free</Link>
              </Button>
              <Button asChild size="lg" variant="outline"
                className="text-[0.95rem] font-medium border-border text-foreground
                           hover:bg-white/[0.04] hover:border-white/20 h-12 rounded-xl px-9">
                <a href="#how">See how it works</a>
              </Button>
            </div>

            {/* ── Stats bar ── */}

            {/* ── Market preview cards ── */}
            <div className="fu-6 relative z-10 mt-10 w-full max-w-[1000px]">
              <p className="lp-mono text-[0.62rem] text-muted-foreground uppercase tracking-[0.12em] text-center mb-4">
                Live market snapshot
              </p>
              <div id="markets" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {MARKETS.map((m, i) => (
                  <div key={i}
                    className="bg-card border border-border rounded-xl p-4
                               hover:border-white/[0.13] hover:-translate-y-0.5 hover:bg-card/70
                               transition-all duration-200 cursor-default">
                    <p className="text-[0.78rem] font-medium text-foreground/85 leading-snug mb-3 line-clamp-2">{m.q}</p>
                    {/* Probability bar */}
                    <div className="h-[5px] rounded-full overflow-hidden mb-2"
                      style={{ background: 'oklch(0.62 0.22 25 / 0.2)' }}>
                      <div className="h-full rounded-full prob-bar-yes transition-all duration-500" style={{ width: `${m.yes}%` }} />
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex gap-3">
                        <span className="lp-mono text-[0.7rem] font-semibold text-bullish">YES {m.yes}¢</span>
                        <span className="lp-mono text-[0.7rem] font-semibold text-bearish">NO {100 - m.yes}¢</span>
                      </div>
                      <Badge variant="outline"
                        className="text-[0.58rem] font-semibold uppercase tracking-wider text-muted-foreground
                                   border-border/70 px-1.5 py-0.5 h-auto rounded-[4px]">
                        {m.cat}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* ══════════════════════════════════════════════════════════
              HOW IT WORKS
          ══════════════════════════════════════════════════════════ */}
          <div id="how" className="bg-card border-y border-border">
            <div className="max-w-6xl mx-auto px-4 lg:px-8 py-28">
              <p className="lp-mono text-[0.62rem] font-bold uppercase tracking-[0.15em] text-[#C9A84C] mb-5">Process</p>
              <h2 className="lp-display text-foreground mb-4" style={{ fontSize: 'clamp(2.2rem, 4vw, 3.4rem)' }}>
                Three steps to your first trade
              </h2>
              <p className="text-muted-foreground max-w-[480px] leading-[1.75] font-light text-[0.95rem]">
                No experience required. ProbMarket is built for anyone who has a view on how the world unfolds.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mt-14">
                {HOW_STEPS.map((step) => (
                  <Card key={step.num}
                    className="how-card group relative overflow-hidden bg-card border-border
                               hover:border-[#C9A84C]/25 hover:bg-background/50
                               transition-all duration-300">
                    <CardContent className="p-8">
                      <p className="lp-mono text-[0.6rem] font-bold text-[#C9A84C] tracking-[0.12em] mb-5">STEP {step.num}</p>
                      <div className="w-11 h-11 rounded-xl flex items-center justify-center text-xl mb-5
                                      border border-[#C9A84C]/15 transition-colors group-hover:border-[#C9A84C]/30"
                        style={{ background: 'rgba(201,168,76,0.07)' }}>
                        {step.icon}
                      </div>
                      <h3 className="lp-display text-[1.3rem] text-foreground mb-3">{step.title}</h3>
                      <p className="text-[0.85rem] text-muted-foreground leading-[1.7] font-light">{step.desc}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </div>


          {/* ══════════════════════════════════════════════════════════
              FEATURES + TERMINAL MOCKUP
          ══════════════════════════════════════════════════════════ */}
          <div id="features" className="max-w-6xl mx-auto px-4 lg:px-8 py-28">
            <p className="lp-mono text-[0.62rem] font-bold uppercase tracking-[0.15em] text-[#C9A84C] mb-5">Features</p>
            <h2 className="lp-display text-foreground mb-14" style={{ fontSize: 'clamp(2.2rem, 4vw, 3.4rem)' }}>
              Built for serious{" "}
              <span className="gold-text italic">market participants</span>
            </h2>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-14 lg:gap-20 items-start">

              {/* Feature list */}
              <div className="flex flex-col gap-1">
                {FEATURES.map(({ Icon, title, desc }, i) => (
                  <div key={i}
                    className="group flex gap-5 p-5 rounded-xl border border-transparent
                               hover:border-border hover:bg-card transition-all duration-200 cursor-default">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0
                                    border border-[#C9A84C]/15 group-hover:border-[#C9A84C]/30 transition-colors"
                      style={{ background: 'rgba(201,168,76,0.07)' }}>
                      <Icon className="size-4 text-[#C9A84C]" />
                    </div>
                    <div>
                      <h4 className="text-[0.95rem] font-semibold text-foreground mb-1.5">{title}</h4>
                      <p className="text-[0.83rem] text-muted-foreground leading-[1.65] font-light">{desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Terminal mockup */}
              <Card className="bg-card border-border overflow-hidden">
                {/* macOS-style title bar */}
                <div className="flex items-center gap-2 px-5 py-3.5 border-b border-border bg-background/60">
                  <div className="w-[10px] h-[10px] rounded-full bg-[#FF5F57]" />
                  <div className="w-[10px] h-[10px] rounded-full bg-[#FFBD2E]" />
                  <div className="w-[10px] h-[10px] rounded-full bg-[#28C840]" />
                  <span className="lp-mono text-[0.64rem] text-muted-foreground mx-auto">
                    probmarket — live markets
                  </span>
                </div>

                <CardContent className="p-5 space-y-0.5">
                  {TERMINAL_ROWS.map((r, i) => (
                    <div key={i} className="mb-3">
                      {/* Row */}
                      <div className="flex items-center justify-between px-3 py-2.5 rounded-lg
                                      border border-border/50 bg-white/[0.02] hover:bg-white/[0.04]
                                      transition-colors duration-150">
                        <div>
                          <p className="lp-mono text-[0.76rem] font-bold text-foreground">{r.sym}</p>
                          <p className="text-[0.68rem] text-muted-foreground">{r.name}</p>
                        </div>
                        <div className="flex items-center gap-2.5">
                          <span className="lp-mono text-[0.78rem] font-semibold text-foreground">{r.price}</span>
                          <span className={`lp-mono text-[0.66rem] font-semibold px-1.5 py-0.5 rounded ${
                            r.up
                              ? "bg-bullish/10 text-bullish"
                              : "bg-bearish/10 text-bearish"
                          }`}>
                            {r.change}
                          </span>
                        </div>
                      </div>

                      {/* Probability bar */}
                      <div className="flex items-center gap-2 px-1 mt-1.5">
                        <span className="lp-mono text-[0.6rem] text-bullish w-7 shrink-0">{r.yes}¢</span>
                        <div className="flex-1 h-[5px] rounded-full overflow-hidden"
                          style={{ background: 'oklch(0.62 0.22 25 / 0.2)' }}>
                          <div className="h-full rounded-full prob-bar-yes" style={{ width: `${r.yes}%` }} />
                        </div>
                        <span className="lp-mono text-[0.6rem] text-bearish w-7 text-right shrink-0">{100 - r.yes}¢</span>
                      </div>
                    </div>
                  ))}

                  {/* Blinking cursor */}
                  <div className="flex items-center gap-1.5 pt-2 px-1">
                    <span className="lp-mono text-[0.68rem] text-[#C9A84C]">›</span>
                    <span className="cursor-blink inline-block w-[7px] h-[14px] rounded-[1px] bg-[#C9A84C]/85" />
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* ══════════════════════════════════════════════════════════
              CTA
          ══════════════════════════════════════════════════════════ */}
          <div className="relative py-32 text-center border-t border-border overflow-hidden">
            {/* Bottom glow */}
            <div className="absolute inset-0 pointer-events-none"
              style={{ background: 'radial-gradient(ellipse 700px 480px at 50% 115%, rgba(201,168,76,0.07), transparent)' }} />

            <div className="relative z-10 max-w-3xl mx-auto px-4">
              <Badge variant="outline"
                className="mb-8 rounded-full px-4 py-1.5 text-[0.68rem] font-semibold uppercase tracking-[0.1em]
                           border-[#C9A84C]/25 bg-[#C9A84C]/8 text-[#E8C86A] gap-2 h-auto inline-flex">
                <span className="live-dot w-1.5 h-1.5 rounded-full bg-bullish" />
                Join 12,000+ traders today
              </Badge>

              <h2 className="lp-display text-foreground mb-6" style={{ fontSize: 'clamp(2.5rem, 5.5vw, 4.5rem)' }}>
                Ready to trade the<br />
                <span className="gold-text italic">world's events?</span>
              </h2>

              <p className="text-muted-foreground max-w-[420px] mx-auto mb-10 leading-[1.75] font-light text-[0.97rem]">
                Join thousands of traders already making markets on ProbMarket.
                Your first $1,000 of virtual funds is on us.
              </p>

              <div className="flex items-center justify-center gap-3 flex-wrap">
                <Button asChild size="lg"
                  className="text-[0.95rem] font-semibold text-[#09090B] border-0 px-10 h-12 rounded-xl
                             transition-all duration-250 hover:-translate-y-0.5 hover:shadow-[0_10px_40px_rgba(201,168,76,0.45)]"
                  style={{ background: 'linear-gradient(135deg, #C9A84C, #E8C86A)' }}>
                  <Link href="/auth">Create free account</Link>
                </Button>
                <Button asChild size="lg" variant="outline"
                  className="text-[0.95rem] border-border text-foreground hover:bg-white/[0.04] hover:border-white/20 h-12 rounded-xl px-10 gap-2">
                  <Link href="/auth">Sign in <ArrowRight className="size-4" /></Link>
                </Button>
              </div>

              <p className="mt-6 lp-mono text-[0.68rem] text-muted-foreground/55">
                No credit card required · $1,000 in demo funds · Instant access
              </p>
            </div>
          </div>

          {/* ══════════════════════════════════════════════════════════
              FOOTER
          ══════════════════════════════════════════════════════════ */}
          <footer className="border-t border-border px-6 lg:px-12 py-8 flex flex-col md:flex-row items-center justify-between gap-5">
            <div className="flex items-center gap-2.5">
              <div className="w-6 h-6 rounded-md flex items-center justify-center"
                style={{ background: 'linear-gradient(135deg, #C9A84C, #E8C86A)' }}>
                <Activity className="size-3 text-[#09090B]" />
              </div>
              <span className="lp-display text-[1rem] text-foreground/45">ProbMarket</span>
            </div>

            <p className="lp-mono text-[0.68rem] text-muted-foreground">
              © 2025 ProbMarket. Built for the demo. Trade responsibly.
            </p>

            <nav className="flex items-center gap-6">
              {[["Sign in","/auth"],["Register","/auth"],["How it works","#how"]].map(([label,href]) => (
                <a key={label} href={href}
                  className="lp-mono text-[0.68rem] text-muted-foreground hover:text-foreground transition-colors duration-200 no-underline">
                  {label}
                </a>
              ))}
            </nav>
          </footer>

        </div>
      </div>
    </>
  );
}