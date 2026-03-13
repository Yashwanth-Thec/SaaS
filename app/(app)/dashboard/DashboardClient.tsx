"use client";
import Link from "next/link";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis,
  Tooltip, ResponsiveContainer, Cell, PieChart, Pie,
} from "recharts";
import {
  AlertTriangle, TrendingDown, AppWindow,
  Users, Zap, ArrowRight, Plug, CheckCircle2,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardBody } from "@/components/ui/Card";
import { Badge, StatusBadge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { formatCurrency, formatPercent, utilization, CATEGORY_COLORS, type AppCategory } from "@/lib/utils";

// ─── Demo data fallback (shown when no real apps added yet) ──────────────────
const DEMO_SPEND = [
  { label: "Oct", total: 42800 },
  { label: "Nov", total: 44200 },
  { label: "Dec", total: 47900 },
  { label: "Jan", total: 51200 },
  { label: "Feb", total: 49800 },
  { label: "Mar", total: 53400 },
];

const DEMO_APPS = [
  { id: "1", name: "Salesforce",  category: "finance",       monthlySpend: 12400, totalSeats: 80, activeSeats: 61, status: "active"  },
  { id: "2", name: "Slack",       category: "communication", monthlySpend: 8200,  totalSeats: 200, activeSeats: 187, status: "active" },
  { id: "3", name: "Notion",      category: "productivity",  monthlySpend: 3200,  totalSeats: 150, activeSeats: 42, status: "zombie"  },
  { id: "4", name: "Figma",       category: "design",        monthlySpend: 2800,  totalSeats: 40,  activeSeats: 38, status: "active"  },
  { id: "5", name: "Jira",        category: "dev",           monthlySpend: 2400,  totalSeats: 120, activeSeats: 101, status: "active" },
  { id: "6", name: "Asana",       category: "productivity",  monthlySpend: 1900,  totalSeats: 60,  activeSeats: 11, status: "zombie"  },
  { id: "7", name: "Zoom",        category: "communication", monthlySpend: 1600,  totalSeats: 200, activeSeats: 148, status: "active" },
  { id: "8", name: "Monday.com",  category: "productivity",  monthlySpend: 1400,  totalSeats: 50,  activeSeats: 9, status: "zombie"   },
];

const DEMO_ALERTS = [
  { id: "a1", type: "zombie_app",       severity: "critical", title: "Notion: 72% seats unused",       body: "108 of 150 seats have had no login in 90+ days. Potential savings: $2,304/mo." },
  { id: "a2", type: "renewal_upcoming", severity: "warning",  title: "Salesforce renews in 23 days",   body: "Contract value: $148,800. Benchmark shows you're paying 34% above market rate." },
  { id: "a3", type: "redundancy",       severity: "warning",  title: "3 overlapping project tools",    body: "Asana, Monday.com, and Notion all serve the same use case. Consolidate to save $5,100/mo." },
  { id: "a4", type: "unused_seats",     severity: "info",     title: "Asana: 82% seats idle",          body: "49 of 60 seats unused. Downgrade to free tier or cancel." },
];

// ─── Types ────────────────────────────────────────────────────────────────────
type DashboardData = {
  totalMonthlySpend: number;
  potentialSavings: number;
  totalApps: number;
  activeEmployees: number;
  unusedSeats: number;
  zombieCount: number;
  alerts: { id: string; type: string; severity: string; title: string; body: string }[];
  spendTimeline: { label: string; total: number }[];
  categoryBreakdown: { name: string; value: number }[];
  topApps: {
    id: string; name: string; category: string;
    monthlySpend: number; totalSeats: number; activeSeats: number; status: string;
  }[];
  integrations: { id: string; type: string; name: string; status: string }[];
  hasData: boolean;
};

// ─── Stat Card ────────────────────────────────────────────────────────────────
function StatCard({
  label, value, sub, icon: Icon, accent, trend,
}: {
  label: string; value: string; sub?: string;
  icon: React.ElementType; accent?: boolean; trend?: string;
}) {
  return (
    <Card className="p-5 animate-fade-in">
      <div className="flex items-start justify-between mb-3">
        <span className="text-xs text-secondary uppercase tracking-wider font-medium">{label}</span>
        <div className={`w-8 h-8 rounded flex items-center justify-center ${accent ? "bg-accent-dim text-accent" : "bg-elevated text-secondary"}`}>
          <Icon className="w-4 h-4" />
        </div>
      </div>
      <div className={`font-mono font-bold text-2xl ${accent ? "text-accent" : "text-primary"}`}>
        {value}
      </div>
      {(sub || trend) && (
        <div className="flex items-center gap-2 mt-1.5">
          {sub && <span className="text-xs text-secondary">{sub}</span>}
          {trend && (
            <span className={`text-xs font-medium ${trend.startsWith("+") ? "text-danger" : "text-accent"}`}>
              {trend}
            </span>
          )}
        </div>
      )}
    </Card>
  );
}

// ─── Alert severity color ─────────────────────────────────────────────────────
function alertColor(severity: string) {
  if (severity === "critical") return "text-danger";
  if (severity === "warning")  return "text-warning";
  return "text-info";
}
function alertBg(severity: string) {
  if (severity === "critical") return "bg-danger/5 border-danger/20";
  if (severity === "warning")  return "bg-warning/5 border-warning/20";
  return "bg-info/5 border-info/20";
}

// ─── Custom tooltip ────────────────────────────────────────────────────────────
function SpendTooltip({ active, payload, label }: {
  active?: boolean; payload?: { value: number }[]; label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-elevated border border-border rounded px-3 py-2 text-xs shadow-card">
      <div className="text-muted mb-1">{label}</div>
      <div className="font-mono font-bold text-primary">{formatCurrency(payload[0].value)}</div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export function DashboardClient({ data }: { data: DashboardData }) {
  const isDemo = !data.hasData;

  const spend    = isDemo ? 53400 : data.totalMonthlySpend;
  const savings  = isDemo ? 8600  : data.potentialSavings;
  const appCount = isDemo ? 24    : data.totalApps;
  const seats    = isDemo ? 218   : data.unusedSeats;
  const zombies  = isDemo ? 3     : data.zombieCount;
  const alerts   = isDemo ? DEMO_ALERTS : data.alerts;
  const apps     = isDemo ? DEMO_APPS   : data.topApps;
  const timeline = isDemo
    ? DEMO_SPEND
    : data.spendTimeline.some((m) => m.total > 0)
      ? data.spendTimeline
      : DEMO_SPEND;

  const categoryData = isDemo
    ? [
        { name: "finance",       value: 12400 },
        { name: "communication", value: 9800  },
        { name: "productivity",  value: 8500  },
        { name: "design",        value: 2800  },
        { name: "dev",           value: 2400  },
        { name: "other",         value: 5100  },
      ]
    : data.categoryBreakdown;

  return (
    <div className="p-6 space-y-6">
      {/* Demo banner */}
      {isDemo && (
        <div className="flex items-center justify-between px-4 py-3 rounded-lg bg-accent/5 border border-accent/20 animate-fade-in">
          <div className="flex items-center gap-2.5">
            <Zap className="w-4 h-4 text-accent" />
            <span className="text-sm text-accent font-medium">Demo mode</span>
            <span className="text-xs text-accent/70">— connect your first integration to see real data</span>
          </div>
          <Link href="/integrations">
            <Button variant="outline" size="sm">
              Connect now <ArrowRight className="w-3 h-3" />
            </Button>
          </Link>
        </div>
      )}

      {/* KPI row */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          label="Monthly Spend"
          value={formatCurrency(spend, { compact: true })}
          sub="across all apps"
          icon={TrendingDown}
          trend="+4.2% vs last mo"
        />
        <StatCard
          label="Potential Savings"
          value={formatCurrency(savings, { compact: true })}
          sub={`${zombies} zombie apps`}
          icon={Zap}
          accent
        />
        <StatCard
          label="Apps Tracked"
          value={String(appCount)}
          sub="SaaS tools detected"
          icon={AppWindow}
        />
        <StatCard
          label="Unused Seats"
          value={String(seats)}
          sub="paying for nobody"
          icon={Users}
          trend={`-${formatCurrency(seats * 12)}/mo`}
        />
      </div>

      {/* Middle row: chart + alerts */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* Spend chart */}
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle>Monthly Spend Trend</CardTitle>
            <span className="text-xs text-muted font-mono">{formatCurrency(spend)}/mo current</span>
          </CardHeader>
          <CardBody className="pt-0">
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={timeline} margin={{ left: -10, right: 4 }}>
                <defs>
                  <linearGradient id="spendGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%"   stopColor="#00d97e" stopOpacity={0.25} />
                    <stop offset="100%" stopColor="#00d97e" stopOpacity={0}    />
                  </linearGradient>
                </defs>
                <XAxis dataKey="label" tick={{ fill: "#4a5568", fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "#4a5568", fontSize: 11 }} axisLine={false} tickLine={false}
                  tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                <Tooltip content={<SpendTooltip />} />
                <Area
                  type="monotone" dataKey="total"
                  stroke="#00d97e" strokeWidth={2}
                  fill="url(#spendGrad)"
                  dot={false} activeDot={{ r: 4, fill: "#00d97e", stroke: "#070809", strokeWidth: 2 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardBody>
        </Card>

        {/* Category breakdown */}
        <Card>
          <CardHeader>
            <CardTitle>Spend by Category</CardTitle>
          </CardHeader>
          <CardBody className="pt-0">
            <div className="flex items-center justify-center mb-3">
              <ResponsiveContainer width={120} height={120}>
                <PieChart>
                  <Pie
                    data={categoryData} cx="50%" cy="50%"
                    innerRadius={34} outerRadius={54}
                    dataKey="value" paddingAngle={2}
                  >
                    {categoryData.map((entry) => (
                      <Cell
                        key={entry.name}
                        fill={CATEGORY_COLORS[entry.name as AppCategory] ?? "#4a5568"}
                      />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-2">
              {categoryData.slice(0, 5).map((c) => (
                <div key={c.name} className="flex items-center gap-2">
                  <div
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ background: CATEGORY_COLORS[c.name as AppCategory] ?? "#4a5568" }}
                  />
                  <span className="text-xs text-secondary capitalize flex-1">{c.name}</span>
                  <span className="font-mono text-xs text-primary">{formatCurrency(c.value, { compact: true })}</span>
                </div>
              ))}
            </div>
          </CardBody>
        </Card>
      </div>

      {/* Bottom row: app table + alerts */}
      <div className="grid grid-cols-1 xl:grid-cols-5 gap-4">
        {/* App table */}
        <Card className="xl:col-span-3">
          <CardHeader>
            <CardTitle>Top Apps by Spend</CardTitle>
            <Link href="/apps" className="text-xs text-accent hover:text-accent-hover flex items-center gap-1">
              View all <ArrowRight className="w-3 h-3" />
            </Link>
          </CardHeader>
          <CardBody className="pt-0 px-0 pb-0">
            <table className="data-table">
              <thead>
                <tr>
                  <th>App</th>
                  <th>Monthly</th>
                  <th>Utilization</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {apps.map((app) => {
                  const util = utilization(app.activeSeats, app.totalSeats);
                  const barColor =
                    util < 30 ? "#ff4757" :
                    util < 60 ? "#ffb142" :
                    "#00d97e";
                  return (
                    <tr key={app.id}>
                      <td>
                        <div className="flex items-center gap-2.5">
                          <div
                            className="w-6 h-6 rounded flex items-center justify-center text-2xs font-bold flex-shrink-0"
                            style={{
                              background: `${CATEGORY_COLORS[app.category as AppCategory]}20`,
                              color: CATEGORY_COLORS[app.category as AppCategory] ?? "#fff",
                            }}
                          >
                            {app.name.charAt(0)}
                          </div>
                          <span className="text-primary text-xs font-medium">{app.name}</span>
                        </div>
                      </td>
                      <td>
                        <span className="font-mono text-xs text-primary">
                          {formatCurrency(app.monthlySpend, { compact: true })}
                        </span>
                      </td>
                      <td>
                        <div className="flex items-center gap-2">
                          <div className="util-bar w-16">
                            <div
                              className="util-bar-fill"
                              style={{ width: `${util}%`, background: barColor }}
                            />
                          </div>
                          <span
                            className="font-mono text-xs"
                            style={{ color: barColor }}
                          >
                            {formatPercent(util)}
                          </span>
                        </div>
                      </td>
                      <td><StatusBadge status={app.status} /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </CardBody>
        </Card>

        {/* Alerts panel */}
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle>AI Alerts</CardTitle>
            <Badge variant="danger">{alerts.filter((a) => a.severity === "critical").length} critical</Badge>
          </CardHeader>
          <CardBody className="pt-0 space-y-2.5">
            {alerts.map((alert) => (
              <div
                key={alert.id}
                className={`rounded px-3 py-2.5 border text-xs ${alertBg(alert.severity)} animate-fade-in`}
              >
                <div className={`font-semibold mb-0.5 ${alertColor(alert.severity)}`}>
                  {alert.title}
                </div>
                <div className="text-secondary leading-relaxed">{alert.body}</div>
              </div>
            ))}
            {alerts.length === 0 && (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <CheckCircle2 className="w-8 h-8 text-accent mb-2" />
                <div className="text-sm font-medium text-primary">All clear</div>
                <div className="text-xs text-muted mt-1">No active alerts</div>
              </div>
            )}
          </CardBody>
        </Card>
      </div>

      {/* Integration CTA (if no integrations) */}
      {data.integrations.length === 0 && (
        <Card className="p-6 border-accent/20 bg-accent/5 animate-fade-in">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg bg-accent-dim flex items-center justify-center">
                <Plug className="w-5 h-5 text-accent" />
              </div>
              <div>
                <div className="font-display font-semibold text-sm text-primary">Connect your first integration</div>
                <div className="text-xs text-secondary mt-0.5">
                  Link Google Workspace, Okta, or your bank feed to automatically discover your SaaS stack.
                </div>
              </div>
            </div>
            <Link href="/integrations">
              <Button variant="primary" size="sm">
                Connect <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            </Link>
          </div>
        </Card>
      )}
    </div>
  );
}
