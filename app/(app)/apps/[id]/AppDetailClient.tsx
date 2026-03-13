"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
} from "recharts";
import {
  TrendingDown, Users, Calendar, AlertTriangle,
  CheckCircle2, XCircle, Clock, ArrowLeft, Edit2, Trash2,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Badge, StatusBadge } from "@/components/ui/Badge";
import { Card, CardHeader, CardTitle, CardBody } from "@/components/ui/Card";
import { formatCurrency, formatPercent, utilization, CATEGORY_COLORS, initials, type AppCategory } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Employee { id: string; name: string; email: string; department: string | null; jobTitle: string | null; }
interface Access { id: string; role: string | null; lastLoginAt: string | null; loginCount: number; isActive: boolean; employee: Employee; }
interface SpendRecord { id: string; amount: number; date: string; }
interface Contract { id: string; vendor: string; value: number; renewalDate: string; autoRenews: boolean; noticeDays: number; status: string; billingCycle: string; }

interface App {
  id: string; name: string; category: string; monthlySpend: number; annualSpend: number;
  totalSeats: number; activeSeats: number; status: string; source: string; notes: string | null;
  lastDetectedAt: string; contract: Contract | null;
  appAccess: Access[]; spendRecords: SpendRecord[];
}

// ─── Metric card ─────────────────────────────────────────────────────────────

function Metric({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent?: boolean }) {
  return (
    <div className="text-center p-4">
      <div className={`font-mono font-bold text-2xl ${accent ? "text-accent" : "text-primary"}`}>{value}</div>
      <div className="text-xs text-secondary mt-0.5">{label}</div>
      {sub && <div className="text-2xs text-muted mt-0.5">{sub}</div>}
    </div>
  );
}

// ─── Tabs ─────────────────────────────────────────────────────────────────────

const TABS = ["Overview", "Employees", "Spend", "Contract"] as const;
type Tab = typeof TABS[number];

// ─── Main ─────────────────────────────────────────────────────────────────────

export function AppDetailClient({ app: initialApp }: { app: App }) {
  const router = useRouter();
  const [app, setApp]   = useState(initialApp);
  const [tab, setTab]   = useState<Tab>("Overview");
  const [saving, setSaving]   = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [editNotes, setEditNotes] = useState(false);
  const [notes, setNotes]         = useState(app.notes ?? "");

  const util    = utilization(app.activeSeats, app.totalSeats);
  const catColor = CATEGORY_COLORS[app.category as AppCategory] ?? "#8892a0";
  const waste   = app.totalSeats > 0
    ? Math.round(((app.totalSeats - app.activeSeats) / app.totalSeats) * app.monthlySpend)
    : 0;

  async function updateStatus(status: string) {
    setSaving(true);
    const res  = await fetch(`/api/apps/${app.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (res.ok) setApp((a) => ({ ...a, status }));
    setSaving(false);
  }

  async function saveNotes() {
    setSaving(true);
    const res = await fetch(`/api/apps/${app.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notes }),
    });
    if (res.ok) { setApp((a) => ({ ...a, notes })); setEditNotes(false); }
    setSaving(false);
  }

  async function deleteApp() {
    if (!confirm(`Delete ${app.name}? This cannot be undone.`)) return;
    setDeleting(true);
    await fetch(`/api/apps/${app.id}`, { method: "DELETE" });
    router.push("/apps");
  }

  const daysToRenewal = app.contract
    ? Math.ceil((new Date(app.contract.renewalDate).getTime() - Date.now()) / 86400000)
    : null;

  // Build spend chart data from records (or fallback)
  const spendData = app.spendRecords.length > 0
    ? app.spendRecords.map((r) => ({
        label: new Date(r.date).toLocaleString("default", { month: "short" }),
        amount: r.amount,
      }))
    : Array.from({ length: 6 }, (_, i) => {
        const d = new Date();
        d.setMonth(d.getMonth() - (5 - i));
        return { label: d.toLocaleString("default", { month: "short" }), amount: app.monthlySpend };
      });

  return (
    <div className="p-6 max-w-4xl space-y-6">
      {/* Back + header */}
      <div className="flex items-start gap-4">
        <Link href="/apps" className="mt-1 text-muted hover:text-primary transition-colors">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div className="flex-1 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center font-bold text-xl"
              style={{ background: `${catColor}18`, color: catColor, border: `1px solid ${catColor}28` }}
            >
              {app.name.charAt(0)}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-display font-bold text-xl text-primary">{app.name}</h2>
                <StatusBadge status={app.status} />
              </div>
              <div className="text-xs text-secondary mt-0.5 capitalize">{app.category} · {app.source}</div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {app.status !== "cancelled" && (
              <Button variant="danger" size="sm" loading={saving} onClick={() => updateStatus("cancelled")}>
                <XCircle className="w-3.5 h-3.5" />
                Cancel
              </Button>
            )}
            {app.status === "active" && (
              <Button variant="secondary" size="sm" loading={saving} onClick={() => updateStatus("flagged")}>
                <AlertTriangle className="w-3.5 h-3.5" />
                Flag
              </Button>
            )}
            {app.status !== "active" && app.status !== "cancelled" && (
              <Button variant="secondary" size="sm" loading={saving} onClick={() => updateStatus("active")}>
                <CheckCircle2 className="w-3.5 h-3.5" />
                Mark Active
              </Button>
            )}
            <Button variant="ghost" size="sm" loading={deleting} onClick={deleteApp}>
              <Trash2 className="w-3.5 h-3.5 text-danger" />
            </Button>
          </div>
        </div>
      </div>

      {/* Key metrics */}
      <Card>
        <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-border">
          <Metric label="Monthly Spend"  value={formatCurrency(app.monthlySpend)} sub={`${formatCurrency(app.annualSpend)}/yr`} />
          <Metric label="Utilization"    value={app.totalSeats > 0 ? formatPercent(util) : "—"} sub={`${app.activeSeats} / ${app.totalSeats} seats`} accent={util > 0 && util < 40} />
          <Metric label="Wasted Spend"   value={waste > 0 ? formatCurrency(waste) : "—"} sub="per month on idle seats" accent={waste > 0} />
          <Metric label="Renewal"        value={daysToRenewal !== null ? (daysToRenewal < 0 ? "Expired" : `${daysToRenewal}d`) : "—"} sub={app.contract ? new Date(app.contract.renewalDate).toLocaleDateString() : "No contract"} />
        </div>
      </Card>

      {/* Utilization bar (prominent) */}
      {app.totalSeats > 0 && (
        <div>
          <div className="flex justify-between items-center mb-1.5">
            <span className="text-xs text-muted">Seat utilization</span>
            <span className="text-xs font-mono" style={{ color: util < 30 ? "#ff4757" : util < 60 ? "#ffb142" : "#00d97e" }}>
              {app.activeSeats} active · {app.totalSeats - app.activeSeats} idle
            </span>
          </div>
          <div className="h-2 rounded-full bg-border overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{
                width: `${util}%`,
                background: util < 30 ? "#ff4757" : util < 60 ? "#ffb142" : "#00d97e",
              }}
            />
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2.5 text-sm font-medium transition-all border-b-2 -mb-px ${
              tab === t
                ? "border-accent text-accent"
                : "border-transparent text-secondary hover:text-primary"
            }`}
          >
            {t}
            {t === "Employees" && app.appAccess.length > 0 && (
              <span className="ml-1.5 text-2xs bg-border px-1.5 py-0.5 rounded-full">{app.appAccess.length}</span>
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === "Overview" && (
        <div className="space-y-4 animate-fade-in">
          {/* Notes */}
          <Card>
            <CardHeader>
              <CardTitle>Notes</CardTitle>
              <button onClick={() => setEditNotes((v) => !v)} className="text-muted hover:text-primary transition-colors">
                <Edit2 className="w-3.5 h-3.5" />
              </button>
            </CardHeader>
            <CardBody className="pt-0">
              {editNotes ? (
                <div className="space-y-2">
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Add notes about this app…"
                    className="w-full bg-elevated border border-border rounded px-3 py-2 text-sm text-primary placeholder:text-muted focus:outline-none focus:border-accent resize-none h-24"
                  />
                  <div className="flex gap-2">
                    <Button size="sm" loading={saving} onClick={saveNotes}>Save</Button>
                    <Button size="sm" variant="ghost" onClick={() => { setEditNotes(false); setNotes(app.notes ?? ""); }}>Cancel</Button>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-secondary">
                  {app.notes || <span className="text-muted italic">No notes yet. Click edit to add context about this app.</span>}
                </p>
              )}
            </CardBody>
          </Card>

          {/* Quick info */}
          <Card>
            <CardBody>
              <div className="grid grid-cols-2 gap-4 text-sm">
                {[
                  { label: "Source",      value: app.source },
                  { label: "Category",    value: app.category },
                  { label: "Annual Spend",value: formatCurrency(app.annualSpend) },
                  { label: "Last Seen",   value: new Date(app.lastDetectedAt).toLocaleDateString() },
                ].map(({ label, value }) => (
                  <div key={label}>
                    <div className="text-2xs text-muted uppercase tracking-wider mb-0.5">{label}</div>
                    <div className="text-primary capitalize">{value}</div>
                  </div>
                ))}
              </div>
            </CardBody>
          </Card>
        </div>
      )}

      {tab === "Employees" && (
        <div className="animate-fade-in">
          <Card>
            <CardBody className="p-0">
              {app.appAccess.length === 0 ? (
                <div className="py-12 text-center text-muted text-sm">
                  No employee access data yet — connect Google Workspace or Okta to populate this.
                </div>
              ) : (
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Employee</th>
                      <th>Department</th>
                      <th>Role</th>
                      <th>Last Login</th>
                      <th>Logins</th>
                      <th>Active</th>
                    </tr>
                  </thead>
                  <tbody>
                    {app.appAccess.map((a) => (
                      <tr key={a.id}>
                        <td>
                          <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-full bg-elevated border border-border flex items-center justify-center text-2xs font-bold text-primary flex-shrink-0">
                              {initials(a.employee.name)}
                            </div>
                            <div>
                              <div className="text-primary text-xs font-medium">{a.employee.name}</div>
                              <div className="text-2xs text-muted">{a.employee.email}</div>
                            </div>
                          </div>
                        </td>
                        <td className="text-xs">{a.employee.department ?? "—"}</td>
                        <td className="text-xs capitalize">{a.role ?? "user"}</td>
                        <td>
                          {a.lastLoginAt ? (
                            <div>
                              <div className="text-xs text-primary">{new Date(a.lastLoginAt).toLocaleDateString()}</div>
                              {(() => {
                                const daysAgo = Math.floor((Date.now() - new Date(a.lastLoginAt).getTime()) / 86400000);
                                return daysAgo > 90
                                  ? <div className="text-2xs text-danger">{daysAgo}d ago</div>
                                  : daysAgo > 30
                                  ? <div className="text-2xs text-warning">{daysAgo}d ago</div>
                                  : <div className="text-2xs text-muted">{daysAgo}d ago</div>;
                              })()}
                            </div>
                          ) : <span className="text-xs text-muted">Never</span>}
                        </td>
                        <td className="font-mono text-xs">{a.loginCount}</td>
                        <td>
                          {a.isActive
                            ? <CheckCircle2 className="w-3.5 h-3.5 text-accent" />
                            : <XCircle className="w-3.5 h-3.5 text-muted" />
                          }
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </CardBody>
          </Card>
        </div>
      )}

      {tab === "Spend" && (
        <div className="animate-fade-in space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Monthly Spend</CardTitle>
              <span className="font-mono text-xs text-muted">{formatCurrency(app.monthlySpend)}/mo avg</span>
            </CardHeader>
            <CardBody className="pt-0">
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={spendData} margin={{ left: -10, right: 4 }}>
                  <defs>
                    <linearGradient id="spendGradDetail" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%"   stopColor={catColor} stopOpacity={0.25} />
                      <stop offset="100%" stopColor={catColor} stopOpacity={0}    />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="label" tick={{ fill: "#4a5568", fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: "#4a5568", fontSize: 11 }} axisLine={false} tickLine={false}
                    tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                  <Tooltip
                    content={({ active, payload, label }) =>
                      active && payload?.length ? (
                        <div className="bg-elevated border border-border rounded px-3 py-2 text-xs shadow-card">
                          <div className="text-muted mb-1">{label}</div>
                          <div className="font-mono font-bold text-primary">{formatCurrency(payload[0].value as number)}</div>
                        </div>
                      ) : null
                    }
                  />
                  <Area type="monotone" dataKey="amount" stroke={catColor} strokeWidth={2}
                    fill="url(#spendGradDetail)" dot={false}
                    activeDot={{ r: 4, fill: catColor, stroke: "#070809", strokeWidth: 2 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardBody>
          </Card>
        </div>
      )}

      {tab === "Contract" && (
        <div className="animate-fade-in">
          {app.contract ? (
            <Card>
              <CardBody>
                <div className="grid grid-cols-2 gap-6">
                  {[
                    { label: "Vendor",        value: app.contract.vendor },
                    { label: "Contract Value", value: formatCurrency(app.contract.value) },
                    { label: "Billing Cycle",  value: app.contract.billingCycle.replace("_", " ") },
                    { label: "Renewal Date",   value: new Date(app.contract.renewalDate).toLocaleDateString() },
                    { label: "Auto-Renews",    value: app.contract.autoRenews ? "Yes" : "No" },
                    { label: "Notice Period",  value: `${app.contract.noticeDays} days` },
                  ].map(({ label, value }) => (
                    <div key={label}>
                      <div className="text-2xs text-muted uppercase tracking-wider mb-1">{label}</div>
                      <div className="text-sm text-primary capitalize font-medium">{value}</div>
                    </div>
                  ))}
                </div>

                {daysToRenewal !== null && daysToRenewal < 60 && (
                  <div className={`mt-6 flex items-start gap-3 p-3 rounded border ${
                    daysToRenewal < 30 ? "bg-danger/5 border-danger/20" : "bg-warning/5 border-warning/20"
                  }`}>
                    <Clock className={`w-4 h-4 flex-shrink-0 mt-0.5 ${daysToRenewal < 30 ? "text-danger" : "text-warning"}`} />
                    <div>
                      <div className={`text-sm font-medium ${daysToRenewal < 30 ? "text-danger" : "text-warning"}`}>
                        Renewal in {daysToRenewal} days
                      </div>
                      <div className="text-xs text-secondary mt-0.5">
                        Cancel by {new Date(new Date(app.contract.renewalDate).getTime() - app.contract.noticeDays * 86400000).toLocaleDateString()} to avoid auto-renewal.
                      </div>
                    </div>
                  </div>
                )}
              </CardBody>
            </Card>
          ) : (
            <Card className="py-12 text-center">
              <Calendar className="w-8 h-8 text-muted mx-auto mb-3" />
              <div className="text-sm text-secondary">No contract on file</div>
              <div className="text-xs text-muted mt-1">Add a contract to track renewal dates and get alerts.</div>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
