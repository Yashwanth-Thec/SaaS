"use client";
import { useState, useMemo } from "react";
import Link from "next/link";
import {
  Search, SlidersHorizontal, TrendingDown, Zap,
  Users, AppWindow, ArrowUpDown, Plus, X,
  ChevronRight, AlertTriangle,
} from "lucide-react";
import { Badge, StatusBadge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { formatCurrency, formatPercent, utilization, CATEGORY_COLORS, type AppCategory } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

interface App {
  id: string; name: string; category: string;
  monthlySpend: number; totalSeats: number; activeSeats: number;
  status: string; source: string; notes: string | null;
  lastDetectedAt: string;
  contract: { renewalDate: string; value: number; autoRenews: boolean } | null;
}

interface Stats {
  totalSpend: number; zombieCount: number; potentialSave: number; unusedSeats: number;
}

const CATEGORIES = ["all","communication","design","dev","productivity","finance","security","analytics","hr","other"];
const STATUSES   = ["all","active","zombie","flagged","under_review","cancelled"];
const SORT_OPTIONS = [
  { value: "spend",       label: "Monthly Spend" },
  { value: "utilization", label: "Utilization"   },
  { value: "name",        label: "Name"           },
  { value: "seats",       label: "Total Seats"    },
];

// ─── Utilization bar ──────────────────────────────────────────────────────────

function UtilBar({ active, total }: { active: number; total: number }) {
  if (total === 0) return <span className="text-xs text-muted">—</span>;
  const pct = utilization(active, total);
  const color = pct < 30 ? "#ff4757" : pct < 60 ? "#ffb142" : "#00d97e";
  return (
    <div className="flex items-center gap-2 min-w-[100px]">
      <div className="util-bar flex-1">
        <div className="util-bar-fill" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className="font-mono text-xs w-9 text-right" style={{ color }}>
        {formatPercent(pct)}
      </span>
    </div>
  );
}

// ─── App logo placeholder ─────────────────────────────────────────────────────

function AppLogo({ name, category }: { name: string; category: string }) {
  const color = CATEGORY_COLORS[category as AppCategory] ?? "#8892a0";
  return (
    <div
      className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm flex-shrink-0"
      style={{ background: `${color}18`, color, border: `1px solid ${color}28` }}
    >
      {name.charAt(0).toUpperCase()}
    </div>
  );
}

// ─── Summary stat strip ───────────────────────────────────────────────────────

function StatStrip({ stats, filtered }: { stats: Stats; filtered: number }) {
  return (
    <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 mb-6">
      {[
        { icon: TrendingDown, label: "Total Spend",      value: formatCurrency(stats.totalSpend, { compact: true }),   color: "text-primary" },
        { icon: Zap,          label: "Potential Savings", value: formatCurrency(stats.potentialSave, { compact: true }), color: "text-accent"  },
        { icon: AlertTriangle,label: "Zombie Apps",       value: String(stats.zombieCount),                              color: "text-danger"  },
        { icon: Users,        label: "Unused Seats",      value: String(stats.unusedSeats),                              color: "text-warning" },
      ].map(({ icon: Icon, label, value, color }) => (
        <Card key={label} className="flex items-center gap-3 p-4">
          <Icon className={`w-4 h-4 flex-shrink-0 ${color}`} />
          <div>
            <div className={`font-mono font-bold text-lg leading-none ${color}`}>{value}</div>
            <div className="text-2xs text-muted mt-0.5">{label}</div>
          </div>
        </Card>
      ))}
    </div>
  );
}

// ─── Add App modal (simple inline form) ──────────────────────────────────────

function AddAppModal({ onClose, onAdd }: { onClose: () => void; onAdd: (app: App) => void }) {
  const [name, setName]         = useState("");
  const [category, setCategory] = useState("other");
  const [spend, setSpend]       = useState("");
  const [seats, setSeats]       = useState("");
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res  = await fetch("/api/apps", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          name,
          category,
          monthlySpend: parseFloat(spend) || 0,
          totalSeats:   parseInt(seats, 10) || 0,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error); return; }
      onAdd(data);
      onClose();
    } catch { setError("Failed to add app"); }
    finally   { setLoading(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-base/80 backdrop-blur-sm">
      <Card elevated className="w-full max-w-md p-6 animate-fade-in">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-display font-bold text-base text-primary">Add App Manually</h2>
          <button onClick={onClose} className="text-muted hover:text-primary transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs text-muted uppercase tracking-wider block mb-1.5">App Name *</label>
            <input value={name} onChange={(e) => setName(e.target.value)} required
              placeholder="Slack, Notion, Figma…"
              className="w-full bg-surface border border-border rounded px-3 py-2.5 text-sm text-primary placeholder:text-muted focus:outline-none focus:border-accent" />
          </div>
          <div>
            <label className="text-xs text-muted uppercase tracking-wider block mb-1.5">Category</label>
            <select value={category} onChange={(e) => setCategory(e.target.value)}
              className="w-full bg-surface border border-border rounded px-3 py-2.5 text-sm text-primary focus:outline-none focus:border-accent">
              {CATEGORIES.filter((c) => c !== "all").map((c) => (
                <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted uppercase tracking-wider block mb-1.5">Monthly Spend ($)</label>
              <input value={spend} onChange={(e) => setSpend(e.target.value)} type="number" min="0"
                placeholder="0"
                className="w-full bg-surface border border-border rounded px-3 py-2.5 text-sm text-primary placeholder:text-muted focus:outline-none focus:border-accent" />
            </div>
            <div>
              <label className="text-xs text-muted uppercase tracking-wider block mb-1.5">Total Seats</label>
              <input value={seats} onChange={(e) => setSeats(e.target.value)} type="number" min="0"
                placeholder="0"
                className="w-full bg-surface border border-border rounded px-3 py-2.5 text-sm text-primary placeholder:text-muted focus:outline-none focus:border-accent" />
            </div>
          </div>
          {error && <p className="text-xs text-danger">{error}</p>}
          <div className="flex gap-2 pt-1">
            <Button type="submit" loading={loading} className="flex-1">Add App</Button>
            <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          </div>
        </form>
      </Card>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function AppsClient({ initialApps, stats }: { initialApps: App[]; stats: Stats }) {
  const [apps, setApps]           = useState<App[]>(initialApps);
  const [search, setSearch]       = useState("");
  const [category, setCategory]   = useState("all");
  const [status, setStatus]       = useState("all");
  const [sort, setSort]           = useState("spend");
  const [showAdd, setShowAdd]     = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  const filtered = useMemo(() => {
    let list = [...apps];
    if (search)           list = list.filter((a) => a.name.toLowerCase().includes(search.toLowerCase()));
    if (category !== "all") list = list.filter((a) => a.category === category);
    if (status   !== "all") list = list.filter((a) => a.status   === status);
    list.sort((a, b) => {
      if (sort === "name")        return a.name.localeCompare(b.name);
      if (sort === "utilization") return utilization(b.activeSeats, b.totalSeats) - utilization(a.activeSeats, a.totalSeats);
      if (sort === "seats")       return b.totalSeats - a.totalSeats;
      return b.monthlySpend - a.monthlySpend;
    });
    return list;
  }, [apps, search, category, status, sort]);

  // Renewal countdown
  function daysUntilRenewal(dateStr: string) {
    const diff = new Date(dateStr).getTime() - Date.now();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  }

  return (
    <div className="p-6 space-y-4">
      <StatStrip stats={stats} filtered={filtered.length} />

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Search */}
        <div className="relative flex-1 min-w-[180px] max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search apps…"
            className="w-full bg-elevated border border-border rounded pl-8 pr-3 py-2 text-sm text-primary placeholder:text-muted focus:outline-none focus:border-accent"
          />
        </div>

        {/* Sort */}
        <div className="relative">
          <ArrowUpDown className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted pointer-events-none" />
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            className="bg-elevated border border-border rounded pl-8 pr-3 py-2 text-sm text-primary focus:outline-none focus:border-accent appearance-none cursor-pointer"
          >
            {SORT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>

        {/* Filter toggle */}
        <Button
          variant={showFilters ? "primary" : "secondary"}
          size="sm"
          onClick={() => setShowFilters((v) => !v)}
        >
          <SlidersHorizontal className="w-3.5 h-3.5" />
          Filters
          {(category !== "all" || status !== "all") && (
            <span className="ml-1 bg-accent text-base text-2xs rounded-full w-4 h-4 flex items-center justify-center font-bold">
              {[category !== "all", status !== "all"].filter(Boolean).length}
            </span>
          )}
        </Button>

        <div className="ml-auto">
          <Button size="sm" onClick={() => setShowAdd(true)}>
            <Plus className="w-3.5 h-3.5" />
            Add App
          </Button>
        </div>
      </div>

      {/* Expanded filters */}
      {showFilters && (
        <Card className="p-4 animate-fade-in">
          <div className="flex flex-wrap gap-6">
            <div>
              <div className="text-2xs text-muted uppercase tracking-wider mb-2 font-semibold">Category</div>
              <div className="flex flex-wrap gap-1.5">
                {CATEGORIES.map((c) => (
                  <button
                    key={c}
                    onClick={() => setCategory(c)}
                    className={`px-2.5 py-1 rounded text-xs font-medium transition-all ${
                      category === c
                        ? "bg-accent text-base"
                        : "bg-elevated border border-border text-secondary hover:border-secondary"
                    }`}
                  >
                    {c === "all" ? "All" : c.charAt(0).toUpperCase() + c.slice(1)}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <div className="text-2xs text-muted uppercase tracking-wider mb-2 font-semibold">Status</div>
              <div className="flex flex-wrap gap-1.5">
                {STATUSES.map((s) => (
                  <button
                    key={s}
                    onClick={() => setStatus(s)}
                    className={`px-2.5 py-1 rounded text-xs font-medium transition-all ${
                      status === s
                        ? "bg-accent text-base"
                        : "bg-elevated border border-border text-secondary hover:border-secondary"
                    }`}
                  >
                    {s === "all" ? "All" : s.replace("_", " ").charAt(0).toUpperCase() + s.replace("_", " ").slice(1)}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Results count */}
      <div className="flex items-center gap-2 text-xs text-muted">
        <AppWindow className="w-3.5 h-3.5" />
        <span>{filtered.length} app{filtered.length !== 1 ? "s" : ""}</span>
        {(search || category !== "all" || status !== "all") && (
          <button
            onClick={() => { setSearch(""); setCategory("all"); setStatus("all"); }}
            className="flex items-center gap-1 text-accent hover:text-accent-hover"
          >
            <X className="w-3 h-3" /> Clear filters
          </button>
        )}
      </div>

      {/* Table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th className="w-[220px]">App</th>
                <th>Category</th>
                <th>Monthly Spend</th>
                <th>Seats</th>
                <th className="w-[140px]">Utilization</th>
                <th>Contract</th>
                <th>Status</th>
                <th className="w-8" />
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-16 text-muted text-sm">
                    No apps match your filters
                  </td>
                </tr>
              ) : filtered.map((app) => {
                const days    = app.contract ? daysUntilRenewal(app.contract.renewalDate) : null;
                const catColor = CATEGORY_COLORS[app.category as AppCategory] ?? "#8892a0";
                return (
                  <tr key={app.id} className="group">
                    {/* App name */}
                    <td>
                      <div className="flex items-center gap-2.5">
                        <AppLogo name={app.name} category={app.category} />
                        <div>
                          <div className="text-primary text-sm font-medium">{app.name}</div>
                          {app.notes && (
                            <div className="text-2xs text-muted truncate max-w-[140px]">{app.notes}</div>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Category */}
                    <td>
                      <span className="text-xs capitalize" style={{ color: catColor }}>
                        {app.category}
                      </span>
                    </td>

                    {/* Spend */}
                    <td>
                      <span className="font-mono text-sm text-primary">
                        {formatCurrency(app.monthlySpend)}
                      </span>
                      <div className="text-2xs text-muted">
                        {formatCurrency(app.monthlySpend * 12)}/yr
                      </div>
                    </td>

                    {/* Seats */}
                    <td>
                      {app.totalSeats > 0 ? (
                        <span className="font-mono text-xs text-secondary">
                          <span className="text-primary">{app.activeSeats}</span>
                          {" "}/{" "}{app.totalSeats}
                        </span>
                      ) : (
                        <span className="text-xs text-muted">—</span>
                      )}
                    </td>

                    {/* Utilization */}
                    <td>
                      <UtilBar active={app.activeSeats} total={app.totalSeats} />
                    </td>

                    {/* Contract / renewal */}
                    <td>
                      {days !== null ? (
                        <div>
                          <div className={`text-xs font-medium ${
                            days < 30 ? "text-danger" : days < 60 ? "text-warning" : "text-secondary"
                          }`}>
                            {days < 0 ? "Expired" : `${days}d`}
                          </div>
                          <div className="text-2xs text-muted">renewal</div>
                        </div>
                      ) : (
                        <span className="text-xs text-muted">—</span>
                      )}
                    </td>

                    {/* Status */}
                    <td><StatusBadge status={app.status} /></td>

                    {/* Link */}
                    <td>
                      <Link
                        href={`/apps/${app.id}`}
                        className="opacity-0 group-hover:opacity-100 transition-opacity text-muted hover:text-accent"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {showAdd && (
        <AddAppModal
          onClose={() => setShowAdd(false)}
          onAdd={(app) => setApps((prev) => [app, ...prev])}
        />
      )}
    </div>
  );
}
