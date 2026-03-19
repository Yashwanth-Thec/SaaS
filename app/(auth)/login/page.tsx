"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Shield, TrendingDown, Zap, Lock } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

const SAVINGS_TICKER = [
  { company: "Acme Corp",      saved: "$4,200/mo",  action: "cancelled 6 zombie apps" },
  { company: "Horizon Labs",   saved: "$11,800/mo", action: "right-sized Salesforce seats" },
  { company: "Meridian Group", saved: "$2,100/mo",  action: "eliminated redundant tools" },
  { company: "Vertex Systems", saved: "$8,400/mo",  action: "auto-offboarded 12 users" },
];

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [error, setError]       = useState("");
  const [loading, setLoading]   = useState(false);
  const [tickerIdx, setTickerIdx] = useState(0);

  // Rotate ticker every 3s
  useEffect(() => {
    const id = setInterval(() => setTickerIdx((i) => (i + 1) % SAVINGS_TICKER.length), 3000);
    return () => clearInterval(id);
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Login failed"); return; }
      router.push("/dashboard");
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  const tick = SAVINGS_TICKER[tickerIdx];

  return (
    <div className="min-h-screen bg-base flex">
      {/* ── Left: branding panel ── */}
      <div className="hidden lg:flex flex-col w-[52%] bg-surface border-r border-border p-10 relative overflow-hidden">
        {/* Background grid */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `linear-gradient(#00d97e 1px, transparent 1px), linear-gradient(90deg, #00d97e 1px, transparent 1px)`,
            backgroundSize: "40px 40px",
          }}
        />
        {/* Glow orb */}
        <div className="absolute -bottom-32 -left-32 w-96 h-96 rounded-full bg-accent/5 blur-3xl pointer-events-none" />
        <div className="absolute top-20 right-10 w-64 h-64 rounded-full bg-info/5 blur-3xl pointer-events-none" />

        {/* Logo */}
        <div className="flex items-center gap-3 relative z-10">
          <div className="w-9 h-9 rounded-lg bg-accent flex items-center justify-center shadow-glow">
            <Shield className="w-5 h-5 text-base" />
          </div>
          <span className="font-display font-bold text-xl text-primary">SaaS-Scrub</span>
        </div>

        {/* Hero copy */}
        <div className="mt-16 relative z-10">
          <div className="inline-flex items-center gap-2 bg-accent/10 border border-accent/20 rounded-full px-3 py-1 text-xs text-accent font-medium mb-6">
            <Zap className="w-3 h-3" />
            Autonomous SaaS Management
          </div>
          <h2 className="font-display font-bold text-4xl text-primary leading-tight">
            Stop paying for
            <br />
            <span className="text-accent">software nobody uses.</span>
          </h2>
          <p className="mt-4 text-secondary text-base leading-relaxed max-w-sm">
            SaaS-Scrub discovers every app your company pays for, finds the waste,
            and eliminates it — automatically.
          </p>
        </div>

        {/* Live savings ticker */}
        <div className="mt-12 relative z-10">
          <div className="text-2xs text-muted uppercase tracking-wider mb-3 font-semibold">
            Live savings — right now
          </div>
          <div className="card p-4 overflow-hidden h-16 relative">
            <div
              key={tickerIdx}
              className="animate-fade-in absolute inset-4"
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs font-medium text-primary">{tick.company}</div>
                  <div className="text-2xs text-secondary mt-0.5">{tick.action}</div>
                </div>
                <div className="font-mono font-bold text-base" style={{ color: "#00d97e" }}>{tick.saved}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="mt-8 grid grid-cols-3 gap-4 relative z-10">
          {[
            { label: "Avg monthly savings", value: "$6,200" },
            { label: "Apps auto-cancelled", value: "2,847" },
            { label: "ROI (30 days)",        value: "14×"   },
          ].map((s) => (
            <div key={s.label} className="card p-3">
              <div className="font-mono font-bold text-lg" style={{ color: "#00d97e" }}>{s.value}</div>
              <div className="text-2xs text-muted mt-1">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Bottom note */}
        <div className="mt-auto pt-8 relative z-10">
          <div className="flex items-center gap-2 text-2xs text-muted">
            <Lock className="w-3 h-3" />
            SOC 2 Type II compliant · End-to-end encrypted · No card required
          </div>
        </div>
      </div>

      {/* ── Right: login form ── */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="flex items-center gap-2 mb-8 lg:hidden">
            <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center">
              <Shield className="w-4 h-4 text-base" />
            </div>
            <span className="font-display font-bold text-lg text-primary">SaaS-Scrub</span>
          </div>

          <div className="mb-8">
            <h1 className="font-display font-bold text-2xl text-primary">Welcome back</h1>
            <p className="text-secondary text-sm mt-1">Sign in to your workspace</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Work Email"
              type="email"
              placeholder="you@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
            />
            <Input
              label="Password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
            />

            {error && (
              <div className="px-3 py-2.5 rounded bg-danger/10 border border-danger/20 text-xs text-danger">
                {error}
              </div>
            )}

            <Button type="submit" loading={loading} className="w-full mt-2" size="lg">
              Sign in
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-xs text-secondary">
              No account?{" "}
              <Link href="/register" className="text-accent hover:text-accent-hover transition-colors font-medium">
                Create your workspace →
              </Link>
            </p>
          </div>

          {/* Demo credentials */}
          <div className="mt-8 p-3 rounded bg-elevated border border-border">
            <div className="text-2xs text-muted uppercase tracking-wider mb-2 font-semibold">Demo credentials</div>
            <div className="text-xs text-secondary space-y-1">
              <div className="flex justify-between">
                <span className="text-muted">Email</span>
                <span className="font-mono text-primary">admin@acmecorp.io</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">Password</span>
                <span className="font-mono text-primary">demo1234</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
