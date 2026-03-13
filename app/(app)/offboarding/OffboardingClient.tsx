"use client";
import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Users, CheckCircle2, Clock, AlertTriangle,
  Search, X, ChevronRight, Zap, UserMinus,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { formatCurrency, initials } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Employee {
  id: string; name: string; email: string;
  department: string | null; jobTitle: string | null;
  appCount: number; monthlySavings: number; apps: string[];
}

interface OffboardingRecord {
  id: string; status: string; createdAt: string; completedAt: string | null;
  stepsDone: number; stepsTotal: number;
  employee: { id: string; name: string; email: string; department: string | null; jobTitle: string | null };
  createdBy: { name: string };
}

interface Stats {
  activeEmployees: number; inProgress: number; completedThisMonth: number;
}

// ─── Confirm modal ────────────────────────────────────────────────────────────

function ConfirmModal({
  employee,
  onConfirm,
  onClose,
}: {
  employee: Employee;
  onConfirm: (notes: string) => void;
  onClose: () => void;
}) {
  const [notes, setNotes]   = useState("");
  const [loading, setLoading] = useState(false);

  async function handleConfirm() {
    setLoading(true);
    await onConfirm(notes);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-base/80 backdrop-blur-sm p-4">
      <Card elevated className="w-full max-w-lg animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-danger/10 border border-danger/20 flex items-center justify-center">
              <UserMinus className="w-5 h-5 text-danger" />
            </div>
            <div>
              <h2 className="font-display font-bold text-base text-primary">Offboard Employee</h2>
              <p className="text-xs text-secondary">This will queue removal from all apps below</p>
            </div>
          </div>
          <button onClick={onClose} className="text-muted hover:text-primary transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Employee card */}
        <div className="p-5 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-elevated border border-border flex items-center justify-center font-bold text-sm text-primary">
              {initials(employee.name)}
            </div>
            <div>
              <div className="font-medium text-primary">{employee.name}</div>
              <div className="text-xs text-secondary">{employee.email}</div>
              {employee.department && (
                <div className="text-2xs text-muted mt-0.5">{employee.department} · {employee.jobTitle ?? "—"}</div>
              )}
            </div>
            <div className="ml-auto text-right">
              <div className="font-mono font-bold text-accent text-lg">
                {formatCurrency(employee.monthlySavings)}
              </div>
              <div className="text-2xs text-muted">freed /mo</div>
            </div>
          </div>
        </div>

        {/* App list */}
        <div className="p-5 border-b border-border">
          <div className="text-xs text-muted uppercase tracking-wider font-semibold mb-3">
            {employee.appCount} apps will be queued for revocation
          </div>
          {employee.apps.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {employee.apps.map((app) => (
                <span key={app} className="px-2 py-0.5 rounded bg-elevated border border-border text-xs text-secondary">
                  {app}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted">
              No app access records found. Connect an integration to auto-populate.
              You can still proceed and steps will be added for manual review.
            </p>
          )}
        </div>

        {/* Notes */}
        <div className="p-5 border-b border-border">
          <label className="text-xs text-muted uppercase tracking-wider font-semibold block mb-2">
            Notes (optional)
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Reason for offboarding, escalation contacts, etc."
            className="w-full bg-surface border border-border rounded px-3 py-2.5 text-sm text-primary placeholder:text-muted focus:outline-none focus:border-accent resize-none h-20"
          />
        </div>

        {/* Warning */}
        <div className="mx-5 mt-4 flex items-start gap-2 p-3 rounded bg-warning/5 border border-warning/20">
          <AlertTriangle className="w-3.5 h-3.5 text-warning flex-shrink-0 mt-0.5" />
          <p className="text-xs text-secondary">
            This marks the employee as offboarded and creates a checklist.
            Each step must be manually confirmed unless direct API integration is active.
          </p>
        </div>

        {/* Actions */}
        <div className="flex gap-2 p-5">
          <Button
            variant="danger"
            className="flex-1"
            loading={loading}
            onClick={handleConfirm}
          >
            <UserMinus className="w-4 h-4" />
            Start Offboarding
          </Button>
          <Button variant="secondary" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
        </div>
      </Card>
    </div>
  );
}

// ─── Status badge for offboarding records ─────────────────────────────────────

function OffboardingStatus({ status }: { status: string }) {
  if (status === "completed")  return <Badge variant="success">Completed</Badge>;
  if (status === "in_progress") return <Badge variant="warning">In Progress</Badge>;
  if (status === "failed")     return <Badge variant="danger">Failed</Badge>;
  return <Badge variant="neutral">{status}</Badge>;
}

// ─── Main component ───────────────────────────────────────────────────────────

export function OffboardingClient({
  employees: initialEmployees,
  offboardings: initialOffboardings,
  stats,
}: {
  employees: Employee[];
  offboardings: OffboardingRecord[];
  stats: Stats;
}) {
  const router = useRouter();
  const [employees]    = useState(initialEmployees);
  const [offboardings] = useState(initialOffboardings);
  const [search, setSearch]   = useState("");
  const [selected, setSelected] = useState<Employee | null>(null);
  const [starting, setStarting] = useState(false);

  const filtered = useMemo(() =>
    employees.filter((e) =>
      !search ||
      e.name.toLowerCase().includes(search.toLowerCase()) ||
      e.email.toLowerCase().includes(search.toLowerCase()) ||
      (e.department ?? "").toLowerCase().includes(search.toLowerCase())
    ), [employees, search]);

  const inProgress = offboardings.filter((o) => o.status === "in_progress");
  const completed  = offboardings.filter((o) => o.status === "completed");

  async function startOffboarding(notes: string) {
    if (!selected) return;
    setStarting(true);
    try {
      const res  = await fetch("/api/offboarding", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ employeeId: selected.id, notes }),
      });
      const data = await res.json();
      if (!res.ok) { alert(data.error); setStarting(false); return; }
      router.push(`/offboarding/${data.id}`);
    } catch {
      alert("Failed to start offboarding");
      setStarting(false);
    }
  }

  return (
    <div className="p-6 space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { icon: Users,        label: "Active Employees", value: stats.activeEmployees, color: "text-primary"  },
          { icon: Clock,        label: "In Progress",      value: stats.inProgress,      color: "text-warning"  },
          { icon: CheckCircle2, label: "Done This Month",  value: stats.completedThisMonth, color: "text-accent" },
        ].map(({ icon: Icon, label, value, color }) => (
          <Card key={label} className="flex items-center gap-3 p-4">
            <Icon className={`w-5 h-5 flex-shrink-0 ${color}`} />
            <div>
              <div className={`font-mono font-bold text-2xl ${color}`}>{value}</div>
              <div className="text-xs text-muted">{label}</div>
            </div>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
        {/* ── Employee list ─────────────────────────────────────────────── */}
        <div className="xl:col-span-3 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-display font-semibold text-sm text-primary">Active Employees</h2>
            <span className="text-xs text-muted">{filtered.length} shown</span>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, email, department…"
              className="w-full bg-elevated border border-border rounded pl-8 pr-3 py-2 text-sm text-primary placeholder:text-muted focus:outline-none focus:border-accent"
            />
          </div>

          <Card className="overflow-hidden">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Apps</th>
                  <th>Monthly Savings</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="text-center py-12 text-muted text-sm">
                      No employees found
                    </td>
                  </tr>
                ) : filtered.map((emp) => (
                  <tr key={emp.id} className="group">
                    <td>
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-elevated border border-border flex items-center justify-center text-2xs font-bold text-primary flex-shrink-0">
                          {initials(emp.name)}
                        </div>
                        <div>
                          <div className="text-primary text-xs font-medium">{emp.name}</div>
                          <div className="text-2xs text-muted">{emp.department ?? emp.email}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className="font-mono text-xs text-secondary">{emp.appCount}</span>
                    </td>
                    <td>
                      <span className="font-mono text-xs text-accent">
                        {emp.monthlySavings > 0 ? `+${formatCurrency(Math.round(emp.monthlySavings))}/mo` : "—"}
                      </span>
                    </td>
                    <td>
                      <Button
                        variant="danger"
                        size="xs"
                        onClick={() => setSelected(emp)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <UserMinus className="w-3 h-3" />
                        Offboard
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </div>

        {/* ── Offboarding queue ──────────────────────────────────────────── */}
        <div className="xl:col-span-2 space-y-3">
          {/* In progress */}
          <div>
            <h2 className="font-display font-semibold text-sm text-primary mb-3">
              In Progress
              {inProgress.length > 0 && (
                <span className="ml-2 bg-warning/10 text-warning text-2xs px-1.5 py-0.5 rounded-full border border-warning/20">
                  {inProgress.length}
                </span>
              )}
            </h2>
            {inProgress.length === 0 ? (
              <Card className="p-6 text-center">
                <Zap className="w-6 h-6 text-muted mx-auto mb-2" />
                <div className="text-xs text-muted">No offboardings in progress</div>
              </Card>
            ) : (
              <div className="space-y-2">
                {inProgress.map((o) => (
                  <OffboardingCard key={o.id} record={o} />
                ))}
              </div>
            )}
          </div>

          {/* Recently completed */}
          {completed.length > 0 && (
            <div>
              <h2 className="font-display font-semibold text-sm text-primary mb-3">
                Recently Completed
              </h2>
              <div className="space-y-2">
                {completed.slice(0, 5).map((o) => (
                  <OffboardingCard key={o.id} record={o} />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Confirm modal */}
      {selected && (
        <ConfirmModal
          employee={selected}
          onClose={() => setSelected(null)}
          onConfirm={startOffboarding}
        />
      )}
    </div>
  );
}

// ─── Offboarding record card ──────────────────────────────────────────────────

function OffboardingCard({ record }: { record: OffboardingRecord }) {
  const pct = record.stepsTotal > 0
    ? Math.round((record.stepsDone / record.stepsTotal) * 100)
    : 0;
  const barColor = record.status === "completed" ? "#00d97e" : "#ffb142";

  return (
    <a href={`/offboarding/${record.id}`} className="block">
      <Card className="p-3.5 hover:border-secondary transition-colors cursor-pointer group">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-full bg-elevated border border-border flex items-center justify-center text-2xs font-bold text-primary flex-shrink-0">
            {initials(record.employee.name)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-medium text-primary truncate">{record.employee.name}</span>
              <OffboardingStatus status={record.status} />
            </div>
            <div className="flex items-center gap-2 mt-1.5">
              <div className="util-bar flex-1">
                <div className="util-bar-fill" style={{ width: `${pct}%`, background: barColor }} />
              </div>
              <span className="text-2xs font-mono text-secondary flex-shrink-0">
                {record.stepsDone}/{record.stepsTotal}
              </span>
            </div>
          </div>
          <ChevronRight className="w-3.5 h-3.5 text-muted group-hover:text-accent transition-colors flex-shrink-0" />
        </div>
      </Card>
    </a>
  );
}
