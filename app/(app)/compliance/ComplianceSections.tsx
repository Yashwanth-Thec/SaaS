"use client";
import type {
  SaasAppWithAccess,
  OffboardingWithEmployee,
  ContractWithApp,
  AlertRow,
} from "./page";

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function fmt(d: Date | string) {
  return new Date(d).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function fmtMoney(n: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n);
}

export function daysUntil(date: Date | string) {
  return Math.ceil(
    (new Date(date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  );
}

interface OffboardingStep {
  completed: boolean;
}

export function parseSteps(raw: string): OffboardingStep[] {
  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as OffboardingStep[]) : [];
  } catch {
    return [];
  }
}

// ─── Shared sub-components ────────────────────────────────────────────────────

export function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="print-section mb-8">
      <h2 className="font-display font-semibold text-primary text-base mb-3 pb-2 border-b border-border">
        {title}
      </h2>
      {children}
    </div>
  );
}

export function THead({ cols }: { cols: string[] }) {
  return (
    <thead>
      <tr>
        {cols.map((c) => (
          <th
            key={c}
            className="text-left px-4 py-3 text-xs font-semibold text-muted uppercase tracking-wide border-b border-border"
          >
            {c}
          </th>
        ))}
      </tr>
    </thead>
  );
}

// ─── Section 2: App Inventory ─────────────────────────────────────────────────

const STATUS_COLOR: Record<string, string> = {
  active: "text-accent status-active",
  inactive: "text-danger status-inactive",
  flagged: "text-danger status-inactive",
  cancelled: "text-muted status-inactive",
  under_review: "text-warning status-warning",
  zombie: "text-warning status-warning",
};

export function AppInventory({ apps }: { apps: SaasAppWithAccess[] }) {
  return (
    <Section title="Section 2 — SaaS Application Inventory">
      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="data-table w-full">
          <THead
            cols={["App Name","Vendor","Category","Status","Total Seats","Active Seats","Utilization","Monthly Spend","Last Detected"]}
          />
          <tbody>
            {apps.map((a) => {
              const util = a.totalSeats > 0
                ? Math.round((a.activeSeats / a.totalSeats) * 100)
                : 0;
              return (
                <tr key={a.id} className="border-t border-border hover:bg-elevated transition-colors">
                  <td className="px-4 py-3 font-display font-semibold text-primary text-sm">{a.name}</td>
                  <td className="px-4 py-3 text-secondary text-sm">{a.vendor ?? "—"}</td>
                  <td className="px-4 py-3 text-secondary text-sm capitalize">{a.category}</td>
                  <td className={`px-4 py-3 text-sm font-medium capitalize ${STATUS_COLOR[a.status] ?? "text-muted"}`}>
                    {a.status}
                  </td>
                  <td className="px-4 py-3 text-secondary text-sm text-right">{a.totalSeats}</td>
                  <td className="px-4 py-3 text-secondary text-sm text-right">{a.activeSeats}</td>
                  <td className="px-4 py-3 text-sm text-right">
                    <span className={util < 30 ? "text-danger" : util < 60 ? "text-warning" : "text-accent"}>
                      {util}%
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm font-mono text-accent text-right">
                    {fmtMoney(a.monthlySpend)}
                  </td>
                  <td className="px-4 py-3 text-secondary text-sm whitespace-nowrap">
                    {fmt(a.lastDetectedAt)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Section>
  );
}

// ─── Section 3: Access Control ────────────────────────────────────────────────

export function AccessControl({ apps }: { apps: SaasAppWithAccess[] }) {
  return (
    <Section title="Section 3 — Access Control Review">
      <div className="space-y-6">
        {apps.filter((a) => a.appAccess.length > 0).map((a) => (
          <div key={a.id} className="print-section">
            <h3 className="text-sm font-semibold text-secondary mb-2">{a.name}</h3>
            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="data-table w-full">
                <THead cols={["Employee","Email","Role","Last Login","Active"]} />
                <tbody>
                  {a.appAccess.map((acc) => (
                    <tr
                      key={acc.id}
                      className={`border-t border-border transition-colors ${!acc.isActive ? "bg-danger/5" : "hover:bg-elevated"}`}
                    >
                      <td className="px-4 py-3 text-sm font-medium text-primary">{acc.employee.name}</td>
                      <td className="px-4 py-3 text-sm text-secondary">{acc.employee.email}</td>
                      <td className="px-4 py-3 text-sm text-secondary capitalize">{acc.role ?? "user"}</td>
                      <td className="px-4 py-3 text-sm text-secondary whitespace-nowrap">
                        {acc.lastLoginAt ? fmt(acc.lastLoginAt) : "Never"}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {acc.isActive
                          ? <span className="text-accent status-active font-medium">Yes</span>
                          : <span className="text-danger status-inactive font-medium">No</span>
                        }
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </div>
    </Section>
  );
}

// ─── Section 4: Offboarding Compliance ───────────────────────────────────────

export function OffboardingCompliance({ offboardings }: { offboardings: OffboardingWithEmployee[] }) {
  return (
    <Section title="Section 4 — Offboarding Compliance">
      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="data-table w-full">
          <THead cols={["Employee","Department","Status","Steps Completed","Steps Total","Completed At"]} />
          <tbody>
            {offboardings.map((o) => {
              const steps = parseSteps(o.steps);
              const completedCount = steps.filter((s) => s.completed).length;
              const isPending = o.status !== "completed";
              return (
                <tr
                  key={o.id}
                  className={`border-t border-border transition-colors ${isPending ? "bg-danger/5" : "hover:bg-elevated"}`}
                >
                  <td className="px-4 py-3 text-sm font-medium text-primary">{o.employee.name}</td>
                  <td className="px-4 py-3 text-sm text-secondary">{o.employee.department ?? "—"}</td>
                  <td className={`px-4 py-3 text-sm font-medium capitalize ${isPending ? "text-danger status-inactive" : "text-accent status-active"}`}>
                    {o.status}
                  </td>
                  <td className="px-4 py-3 text-sm text-secondary text-right">{completedCount}</td>
                  <td className="px-4 py-3 text-sm text-secondary text-right">{steps.length}</td>
                  <td className="px-4 py-3 text-sm text-secondary whitespace-nowrap">
                    {o.completedAt ? fmt(o.completedAt) : "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Section>
  );
}

// ─── Section 5: Contract Renewals ────────────────────────────────────────────

export function ContractRenewals({ contracts }: { contracts: ContractWithApp[] }) {
  return (
    <Section title="Section 5 — Contract Renewals">
      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="data-table w-full">
          <THead cols={["App","Vendor","Annual Value","Renewal Date","Days Until Renewal","Auto-Renews","Notice Days"]} />
          <tbody>
            {contracts.map((c) => {
              const days = daysUntil(c.renewalDate);
              const rowBg = days <= 30 ? "bg-danger/5" : days <= 60 ? "bg-warning/5" : "";
              const daysClass = days <= 30
                ? "text-danger status-inactive font-semibold"
                : days <= 60
                ? "text-warning status-warning font-semibold"
                : "text-accent";
              return (
                <tr key={c.id} className={`border-t border-border transition-colors ${rowBg} hover:bg-elevated`}>
                  <td className="px-4 py-3 text-sm font-medium text-primary">{c.app.name}</td>
                  <td className="px-4 py-3 text-sm text-secondary">{c.vendor}</td>
                  <td className="px-4 py-3 text-sm font-mono text-accent text-right">{fmtMoney(c.value)}</td>
                  <td className="px-4 py-3 text-sm text-secondary whitespace-nowrap">{fmt(c.renewalDate)}</td>
                  <td className={`px-4 py-3 text-sm text-right ${daysClass}`}>{days}d</td>
                  <td className="px-4 py-3 text-sm text-secondary">
                    {c.autoRenews
                      ? <span className="text-accent status-active">Yes</span>
                      : <span className="text-muted">No</span>
                    }
                  </td>
                  <td className="px-4 py-3 text-sm text-secondary">{c.noticeDays}d</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Section>
  );
}

// ─── Section 6: Unresolved Alerts ────────────────────────────────────────────

const SEV_COLOR: Record<string, string> = {
  critical: "text-danger status-inactive",
  warning: "text-warning status-warning",
  info: "text-blue-400",
};

export function UnresolvedAlerts({ alerts }: { alerts: AlertRow[] }) {
  return (
    <Section title="Section 6 — Unresolved Alerts">
      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="data-table w-full">
          <THead cols={["Severity","Title","App","Created At"]} />
          <tbody>
            {alerts.map((a) => (
              <tr key={a.id} className="border-t border-border hover:bg-elevated transition-colors">
                <td className={`px-4 py-3 text-sm font-semibold capitalize ${SEV_COLOR[a.severity] ?? "text-muted"}`}>
                  {a.severity}
                </td>
                <td className="px-4 py-3 text-sm text-primary">{a.title}</td>
                <td className="px-4 py-3 text-sm text-secondary">{a.appId ?? "—"}</td>
                <td className="px-4 py-3 text-sm text-secondary whitespace-nowrap">{fmt(a.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Section>
  );
}
