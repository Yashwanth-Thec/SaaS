"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Shield, Zap, AlertTriangle, Users, RefreshCw, ArrowRight,
  Check, BarChart2, Lock, GitMerge, CreditCard, Bell,
  TrendingDown, ChevronRight,
} from "lucide-react";

// ─── Static data ──────────────────────────────────────────────────────────────

const TICKER_ITEMS = [
  { company: "Horizon Labs",    saved: "$11,800/mo", action: "right-sized Salesforce seats" },
  { company: "Acme Corp",       saved: "$4,200/mo",  action: "cancelled 6 zombie apps" },
  { company: "Vertex Systems",  saved: "$8,400/mo",  action: "auto-offboarded 12 users" },
  { company: "Meridian Group",  saved: "$2,100/mo",  action: "eliminated redundant tools" },
  { company: "Orbit Finance",   saved: "$6,700/mo",  action: "detected 8 shadow IT apps" },
];

const STATS = [
  { value: "30%",    label: "of SaaS budget wasted on average" },
  { value: "53%",    label: "of licenses unused each month" },
  { value: "$200K+", label: "lost per missed auto-renewal" },
  { value: "65%",    label: "of apps are shadow IT" },
  { value: "14×",    label: "average ROI within 30 days" },
  { value: "2,847",  label: "apps auto-cancelled this month" },
];

const FEATURES = [
  {
    icon: AlertTriangle,
    title: "Zombie App Detection",
    desc: "Surface apps with zero logins in 30+ days. Cancel them before the next auto-renewal fires.",
    stat: "avg 6 zombie apps found per audit",
    colorClass: "text-danger",
    bgClass: "bg-danger/10",
  },
  {
    icon: GitMerge,
    title: "AI Redundancy Analysis",
    desc: "AI maps your stack and flags overlapping tools — Jira + Asana + Monday in the same org is money on fire.",
    stat: "avg $3,200/mo recovered per org",
    colorClass: "text-info",
    bgClass: "bg-info/10",
  },
  {
    icon: Users,
    title: "Automated Offboarding",
    desc: "Employee leaves? Auto-generated checklist: revoke access, transfer data, cancel per-seat licenses. Pre-written vendor emails included.",
    stat: "saves 4.5 hrs per offboarding",
    colorClass: "text-warning",
    bgClass: "bg-warning/10",
  },
  {
    icon: Bell,
    title: "Renewal Calendar",
    desc: "Every contract renewal in one place. 30/7/1-day alerts. Stop losing $200K to missed auto-renewals.",
    stat: "100% of renewals tracked",
    colorClass: "text-accent",
    bgClass: "bg-accent/10",
  },
];

const PRICING = [
  {
    name: "Starter",
    price: "$0",
    period: "/month",
    desc: "For small teams getting started",
    cta: "Start free",
    highlight: false,
    features: [
      "Up to 10 apps tracked",
      "Manual entry only",
      "Basic spend dashboard",
      "Renewal alerts",
      "1 user seat",
    ],
  },
  {
    name: "Growth",
    price: "$299",
    period: "/month",
    desc: "For mid-market teams serious about savings",
    cta: "Start saving →",
    highlight: true,
    features: [
      "Unlimited apps tracked",
      "Google Workspace sync",
      "Plaid bank feed (shadow IT)",
      "AI redundancy detection",
      "Automated offboarding",
      "CSV import",
      "Unlimited users",
      "Priority support",
    ],
  },
  {
    name: "Enterprise",
    price: "20%",
    period: "of first-year savings",
    desc: "Self-funding — pay only after we save you money",
    cta: "Contact sales",
    highlight: false,
    features: [
      "Everything in Growth",
      "Okta / Azure AD sync",
      "Rippling HRIS",
      "Slack notifications",
      "Dedicated CSM",
      "SLA guarantee",
      "Custom integrations",
      "SOC 2 reports",
    ],
  },
];

// ─── ROI Calculator ───────────────────────────────────────────────────────────

function ROICalculator() {
  const [employees, setEmployees]       = useState(200);
  const [monthlySpend, setMonthlySpend] = useState(25000);

  const monthlyWaste = Math.round(monthlySpend * 0.3);
  const annualWaste  = monthlyWaste * 12;
  const annualFee    = 299 * 12;
  const annualNet    = annualWaste - annualFee;
  const roi          = Math.round(annualWaste / annualFee);

  function fmt(n: number) {
    if (n >= 100000) return `$${(n / 1000).toFixed(0)}K`;
    if (n >= 10000)  return `$${(n / 1000).toFixed(1)}K`;
    if (n >= 1000)   return `$${(n / 1000).toFixed(1)}K`;
    return `$${n.toLocaleString()}`;
  }

  const results = [
    { label: "Monthly waste found",   value: fmt(monthlyWaste), sub: "estimated 30% of your SaaS budget",         color: "text-danger"  },
    { label: "Annual waste recovered", value: fmt(annualWaste),  sub: "before SaaS-Scrub fees",                    color: "text-warning" },
    { label: "Net savings (year 1)",   value: fmt(annualNet),    sub: `after Growth plan ($${(annualFee/1000).toFixed(1)}K/yr)`, color: "text-accent"  },
    { label: "Your ROI",               value: `${roi}×`,         sub: "return on investment",                      color: "text-accent"  },
  ];

  return (
    <section id="roi" className="py-24 px-6 relative">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-14">
          <div className="inline-flex items-center gap-2 bg-accent/10 border border-accent/20 rounded-full px-3 py-1 text-xs text-accent font-medium mb-4">
            <BarChart2 className="w-3 h-3" />
            ROI Calculator
          </div>
          <h2 className="font-display font-bold text-3xl md:text-4xl text-primary">
            See your exact savings
          </h2>
          <p className="mt-3 text-secondary max-w-xl mx-auto">
            Adjust the sliders to match your company. We&apos;ll show you exactly what we&apos;d recover.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 items-start">
          {/* Inputs */}
          <div className="card p-6 space-y-10">
            <div>
              <div className="flex justify-between mb-3">
                <span className="text-sm text-secondary font-medium">Team size</span>
                <span className="font-mono font-bold text-accent text-xl">{employees} people</span>
              </div>
              <input
                type="range" min={50} max={1000} step={10}
                value={employees}
                onChange={e => setEmployees(Number(e.target.value))}
                className="w-full h-1.5 rounded-full accent-[#00d97e] cursor-pointer"
              />
              <div className="flex justify-between mt-2 text-2xs text-muted">
                <span>50</span><span>1,000</span>
              </div>
            </div>

            <div>
              <div className="flex justify-between mb-3">
                <span className="text-sm text-secondary font-medium">Monthly SaaS budget</span>
                <span className="font-mono font-bold text-accent text-xl">{fmt(monthlySpend)}</span>
              </div>
              <input
                type="range" min={5000} max={200000} step={1000}
                value={monthlySpend}
                onChange={e => setMonthlySpend(Number(e.target.value))}
                className="w-full h-1.5 rounded-full accent-[#00d97e] cursor-pointer"
              />
              <div className="flex justify-between mt-2 text-2xs text-muted">
                <span>$5K</span><span>$200K</span>
              </div>
            </div>

            <div className="pt-4 border-t border-border flex items-center justify-between">
              <span className="text-xs text-muted">SaaS spend per employee</span>
              <span className="font-mono text-sm text-secondary">
                {fmt(Math.round(monthlySpend / employees))}/mo
              </span>
            </div>
          </div>

          {/* Results */}
          <div className="space-y-3">
            {results.map((r) => (
              <div key={r.label} className="card p-4 flex items-center justify-between gap-4">
                <div>
                  <div className="text-xs text-secondary font-medium">{r.label}</div>
                  <div className="text-2xs text-muted mt-0.5">{r.sub}</div>
                </div>
                <div className={`font-mono font-bold text-2xl shrink-0 ${r.color}`}>{r.value}</div>
              </div>
            ))}

            <Link
              href="/register"
              className="flex items-center justify-center gap-2 w-full mt-2 py-3.5 rounded-lg bg-accent text-base font-bold hover:bg-accent-hover transition-all shadow-glow"
            >
              Start finding waste for free <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── Main Landing Page ────────────────────────────────────────────────────────

export default function LandingPage() {
  const [tickerIdx, setTickerIdx] = useState(0);
  const [scrolled,  setScrolled]  = useState(false);

  useEffect(() => {
    const id = setInterval(() => setTickerIdx(i => (i + 1) % TICKER_ITEMS.length), 3000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const tick = TICKER_ITEMS[tickerIdx];

  return (
    <div className="min-h-screen bg-base text-primary font-sans overflow-x-hidden">

      {/* Global grid background */}
      <div
        className="fixed inset-0 pointer-events-none opacity-[0.025]"
        style={{
          backgroundImage: `linear-gradient(#00d97e 1px, transparent 1px), linear-gradient(90deg, #00d97e 1px, transparent 1px)`,
          backgroundSize: "60px 60px",
        }}
      />

      {/* ── Navbar ─────────────────────────────────────────────────────────── */}
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled ? "bg-base/90 backdrop-blur-md border-b border-border" : ""
      }`}>
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center shadow-glow-sm">
              <Shield className="w-4 h-4 text-base" />
            </div>
            <span className="font-display font-bold text-lg text-primary">SaaS-Scrub</span>
          </div>

          <div className="hidden md:flex items-center gap-8 text-sm text-secondary">
            <a href="#features" className="hover:text-primary transition-colors">Features</a>
            <a href="#roi"      className="hover:text-primary transition-colors">ROI Calculator</a>
            <a href="#pricing"  className="hover:text-primary transition-colors">Pricing</a>
          </div>

          <div className="flex items-center gap-3">
            <Link href="/login"
              className="text-sm text-secondary hover:text-primary transition-colors hidden sm:block">
              Sign in
            </Link>
            <Link href="/register"
              className="text-sm bg-accent text-base font-bold px-4 py-2 rounded-lg hover:bg-accent-hover transition-all shadow-glow-sm">
              Start free →
            </Link>
          </div>
        </div>
      </nav>

      {/* ── Hero ───────────────────────────────────────────────────────────── */}
      <section className="relative pt-36 pb-24 px-6 overflow-hidden">
        {/* Glow orbs */}
        <div className="absolute top-20 left-1/3 w-[500px] h-[500px] rounded-full bg-accent/[0.04] blur-[120px] pointer-events-none" />
        <div className="absolute bottom-0  right-1/4 w-64   h-64   rounded-full bg-info/[0.05]  blur-[80px]  pointer-events-none" />

        <div className="max-w-4xl mx-auto text-center relative z-10">

          {/* Badge */}
          <div
            className="inline-flex items-center gap-2 bg-accent/10 border border-accent/20 rounded-full px-3 py-1.5 text-xs text-accent font-medium mb-8 animate-fade-in"
          >
            <Zap className="w-3 h-3" />
            Autonomous SaaS Management · Built for Mid-Market
          </div>

          {/* Headline */}
          <h1
            className="font-display font-bold text-5xl md:text-[4.5rem] leading-[1.04] text-primary mb-6 animate-fade-in"
            style={{ animationDelay: "0.08s" }}
          >
            Stop paying for
            <br />
            <span className="text-accent">software nobody uses.</span>
          </h1>

          {/* Subtext */}
          <p
            className="text-secondary text-lg md:text-xl max-w-2xl mx-auto leading-relaxed mb-10 animate-fade-in"
            style={{ animationDelay: "0.16s" }}
          >
            SaaS-Scrub connects to your Google Workspace and bank feeds to discover every
            subscription, surface every dollar wasted, and eliminate it — automatically.
          </p>

          {/* CTAs */}
          <div
            className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-14 animate-fade-in"
            style={{ animationDelay: "0.24s" }}
          >
            <Link
              href="/register"
              className="flex items-center gap-2 bg-accent text-base font-bold px-8 py-4 rounded-xl hover:bg-accent-hover transition-all shadow-glow text-lg w-full sm:w-auto justify-center"
            >
              Start for free <ArrowRight className="w-5 h-5" />
            </Link>
            <Link
              href="/login"
              className="flex items-center gap-2 border border-border text-secondary font-semibold px-8 py-4 rounded-xl hover:border-accent/40 hover:text-primary transition-all text-lg w-full sm:w-auto justify-center"
            >
              View live demo <ChevronRight className="w-5 h-5" />
            </Link>
          </div>

          {/* Live savings ticker */}
          <div
            className="inline-flex items-center gap-3 bg-surface border border-border rounded-xl px-5 py-3 animate-fade-in"
            style={{ animationDelay: "0.32s" }}
          >
            <div className="w-2 h-2 rounded-full bg-accent animate-pulse-slow shrink-0" />
            <span className="text-xs text-muted uppercase tracking-wider font-semibold shrink-0">Live</span>
            <div key={tickerIdx} className="animate-fade-in flex items-center gap-4">
              <span className="text-sm text-secondary">
                {tick.company} <span className="text-muted">{tick.action}</span>
              </span>
              <span className="font-mono font-bold text-accent">{tick.saved}</span>
            </div>
          </div>
        </div>

        {/* Metric cards */}
        <div
          className="max-w-4xl mx-auto mt-16 grid grid-cols-2 md:grid-cols-4 gap-4 animate-fade-in"
          style={{ animationDelay: "0.4s" }}
        >
          {[
            { label: "Avg waste per company",  value: "$84K",  icon: TrendingDown, color: "text-accent"  },
            { label: "Of SaaS licenses unused", value: "53%",  icon: RefreshCw,    color: "text-info"    },
            { label: "Market paying $25K+/yr",  value: "90%",  icon: Users,        color: "text-warning" },
            { label: "Avg ROI on $299/mo",      value: "14×",  icon: BarChart2,    color: "text-accent"  },
          ].map((m) => (
            <div key={m.label} className="card p-4 text-center animate-float" style={{ animationDelay: `${Math.random() * 2}s` }}>
              <m.icon className={`w-5 h-5 ${m.color} mx-auto mb-2 opacity-70`} />
              <div className={`font-mono font-bold text-2xl ${m.color}`}>{m.value}</div>
              <div className="text-2xs text-muted mt-1 leading-tight">{m.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Stats marquee ──────────────────────────────────────────────────── */}
      <div className="border-y border-border bg-surface py-4 overflow-hidden">
        <div className="flex gap-0 animate-marquee" style={{ width: "max-content" }}>
          {[...STATS, ...STATS].map((s, i) => (
            <div key={i} className="flex items-center gap-3 shrink-0 px-8">
              <span className="font-mono font-bold text-accent text-lg">{s.value}</span>
              <span className="text-secondary text-sm">{s.label}</span>
              <span className="text-border text-2xl ml-4 opacity-30">·</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Features ───────────────────────────────────────────────────────── */}
      <section id="features" className="py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <div className="inline-flex items-center gap-2 bg-accent/10 border border-accent/20 rounded-full px-3 py-1 text-xs text-accent font-medium mb-4">
              <Zap className="w-3 h-3" />
              Platform Features
            </div>
            <h2 className="font-display font-bold text-3xl md:text-4xl text-primary">
              Everything you need to cut SaaS waste
            </h2>
            <p className="mt-3 text-secondary max-w-xl mx-auto">
              One platform to discover every subscription, eliminate the waste, and automate the cleanup.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-5">
            {FEATURES.map((f) => (
              <div
                key={f.title}
                className="card p-6 hover:border-accent/20 transition-colors group"
              >
                <div className="flex items-start gap-4">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${f.bgClass}`}>
                    <f.icon className={`w-5 h-5 ${f.colorClass}`} />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-display font-bold text-lg text-primary mb-2">{f.title}</h3>
                    <p className="text-secondary text-sm leading-relaxed mb-3">{f.desc}</p>
                    <div className="inline-flex items-center gap-1.5 text-2xs text-muted bg-elevated border border-border rounded px-2 py-1">
                      <Check className="w-3 h-3 text-accent shrink-0" />
                      {f.stat}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Integrations strip */}
          <div className="mt-6 card p-5">
            <div className="text-xs text-muted text-center uppercase tracking-wider font-semibold mb-4">
              Connects with your existing stack
            </div>
            <div className="flex flex-wrap justify-center gap-3">
              {["Google Workspace", "Plaid Bank Feed", "Okta", "Azure AD", "Rippling HRIS", "CSV Import"].map((name) => (
                <div key={name} className="flex items-center gap-2 bg-elevated border border-border rounded px-3 py-1.5 text-xs text-secondary">
                  <div className="w-1.5 h-1.5 rounded-full bg-accent" />
                  {name}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── ROI Calculator ─────────────────────────────────────────────────── */}
      <ROICalculator />

      {/* ── Pricing ────────────────────────────────────────────────────────── */}
      <section id="pricing" className="py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <div className="inline-flex items-center gap-2 bg-accent/10 border border-accent/20 rounded-full px-3 py-1 text-xs text-accent font-medium mb-4">
              <CreditCard className="w-3 h-3" />
              Pricing
            </div>
            <h2 className="font-display font-bold text-3xl md:text-4xl text-primary">
              Pricing that pays for itself
            </h2>
            <p className="mt-3 text-secondary max-w-xl mx-auto">
              Most customers recover 10–30× our fee in the first month alone.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {PRICING.map((plan) => (
              <div
                key={plan.name}
                className={`card p-6 flex flex-col relative ${
                  plan.highlight ? "border-accent/40 shadow-glow" : ""
                }`}
              >
                {plan.highlight && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-accent text-base text-xs font-bold px-3 py-1 rounded-full whitespace-nowrap">
                    Most Popular
                  </div>
                )}

                <div className="mb-5">
                  <div className="text-xs text-muted uppercase tracking-wider font-semibold mb-2">{plan.name}</div>
                  <div className="flex items-baseline gap-1.5 mb-1">
                    <span className="font-mono font-bold text-4xl text-primary">{plan.price}</span>
                    <span className="text-muted text-xs leading-tight">{plan.period}</span>
                  </div>
                  <p className="text-xs text-secondary">{plan.desc}</p>
                </div>

                <ul className="space-y-2.5 flex-1 mb-6">
                  {plan.features.map((feat) => (
                    <li key={feat} className="flex items-start gap-2 text-sm text-secondary">
                      <Check className="w-4 h-4 text-accent shrink-0 mt-0.5" />
                      {feat}
                    </li>
                  ))}
                </ul>

                <Link
                  href="/register"
                  className={`w-full py-3 rounded-lg text-sm font-bold text-center transition-all ${
                    plan.highlight
                      ? "bg-accent text-base hover:bg-accent-hover shadow-glow-sm"
                      : "border border-border text-secondary hover:border-accent/40 hover:text-primary"
                  }`}
                >
                  {plan.cta}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Final CTA ──────────────────────────────────────────────────────── */}
      <section className="py-20 px-6">
        <div className="max-w-3xl mx-auto relative">
          <div className="absolute inset-0 bg-accent/5 rounded-2xl blur-2xl" />
          <div className="relative card p-12 border-accent/20 text-center">
            <div className="w-12 h-12 rounded-xl bg-accent/10 border border-accent/20 flex items-center justify-center mx-auto mb-6">
              <Shield className="w-6 h-6 text-accent" />
            </div>
            <h2 className="font-display font-bold text-3xl md:text-4xl text-primary mb-4">
              Ready to stop the waste?
            </h2>
            <p className="text-secondary mb-8 max-w-lg mx-auto leading-relaxed">
              Join companies eliminating an average of $6,200/month in unnecessary SaaS spend.
              Setup takes 5 minutes. No credit card required.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/register"
                className="flex items-center gap-2 bg-accent text-base font-bold px-8 py-4 rounded-xl hover:bg-accent-hover transition-all shadow-glow w-full sm:w-auto justify-center text-lg"
              >
                Start for free <ArrowRight className="w-5 h-5" />
              </Link>
              <Link
                href="/login"
                className="flex items-center gap-2 border border-border text-secondary font-semibold px-8 py-4 rounded-xl hover:border-accent/40 hover:text-primary transition-all w-full sm:w-auto justify-center text-lg"
              >
                Use demo account →
              </Link>
            </div>
            <div className="mt-6 flex items-center justify-center gap-2 text-xs text-muted">
              <Lock className="w-3 h-3" />
              End-to-end encrypted · No credit card required · Cancel anytime
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ─────────────────────────────────────────────────────────── */}
      <footer className="border-t border-border py-8 px-6">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-accent flex items-center justify-center">
              <Shield className="w-3.5 h-3.5 text-base" />
            </div>
            <span className="font-display font-bold text-sm text-primary">SaaS-Scrub</span>
            <span className="text-muted text-xs ml-2">© 2026</span>
          </div>
          <div className="flex items-center gap-6 text-xs text-muted">
            <a href="#features" className="hover:text-secondary transition-colors">Features</a>
            <a href="#pricing"  className="hover:text-secondary transition-colors">Pricing</a>
            <Link href="/login"    className="hover:text-secondary transition-colors">Sign in</Link>
            <Link href="/register" className="hover:text-secondary transition-colors">Get started</Link>
            <a href="https://x.com/Saas_Scrub" target="_blank" rel="noopener noreferrer" className="hover:text-secondary transition-colors">@Saas_Scrub</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
