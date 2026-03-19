"use client";
import { Printer } from "lucide-react";
import type { ComplianceData } from "./page";
import {
  fmt,
  fmtMoney,
  Section,
  AppInventory,
  AccessControl,
  OffboardingCompliance,
  ContractRenewals,
  UnresolvedAlerts,
} from "./ComplianceSections";

// ─── Print CSS ────────────────────────────────────────────────────────────────

const PRINT_CSS = `
@media print {
  .no-print { display: none !important; }
  body { background: white !important; color: black !important; }
  .print-section { page-break-inside: avoid; }
  table { border-collapse: collapse; width: 100%; }
  th, td { border: 1px solid #ccc; padding: 6px 10px; font-size: 11px; }
  th { background: #f5f5f5; }
  .status-active { color: #16a34a; }
  .status-inactive { color: #dc2626; }
  .status-warning { color: #d97706; }
}
`;

// ─── KPI card ─────────────────────────────────────────────────────────────────

function KpiCard({
  label,
  value,
  colorClass,
}: {
  label: string;
  value: string;
  colorClass?: string;
}) {
  return (
    <div className="bg-surface border border-border rounded-lg p-4 flex flex-col gap-1">
      <span className={`text-2xl font-mono font-bold ${colorClass ?? "text-primary"}`}>
        {value}
      </span>
      <span className="text-xs text-muted">{label}</span>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function ComplianceClient({ data }: { data: ComplianceData }) {
  const { org, generatedAt, apps, offboardings, contracts, alerts, summary } = data;
  const reportYear = new Date(generatedAt).getFullYear();

  return (
    <div className="min-h-screen bg-base text-primary">
      {/* Print styles */}
      <style dangerouslySetInnerHTML={{ __html: PRINT_CSS }} />

      {/* Sticky header (screen only) */}
      <div className="no-print sticky top-0 z-10 bg-surface/95 backdrop-blur border-b border-border px-6 py-3 flex items-center justify-between">
        <div>
          <h1 className="font-display font-bold text-primary text-sm">SOC 2 Compliance Report</h1>
          <p className="text-xs text-muted mt-0.5">
            {org.name} — Generated {fmt(generatedAt)}
          </p>
        </div>
        <button
          onClick={() => window.print()}
          className="inline-flex items-center gap-2 px-4 py-2 bg-accent text-base text-sm font-semibold rounded-lg hover:bg-accent/90 transition-colors"
        >
          <Printer className="w-4 h-4" />
          Export PDF
        </button>
      </div>

      {/* Report body */}
      <div className="max-w-7xl mx-auto px-6 py-8">

        {/* Report header */}
        <div className="print-section mb-8 pb-6 border-b border-border">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="font-display font-bold text-2xl text-primary">{org.name}</h1>
              <h2 className="font-display font-semibold text-lg text-secondary mt-1">
                SOC 2 Compliance Report
              </h2>
            </div>
            <div className="text-right">
              <p className="text-sm text-secondary">Generated: {fmt(generatedAt)}</p>
              <p className="text-sm text-muted">
                Report Period: Jan 1, {reportYear} – Dec 31, {reportYear}
              </p>
              <p className="text-xs text-muted mt-1 capitalize">Plan: {org.plan}</p>
            </div>
          </div>
        </div>

        {/* Section 1: Executive Summary */}
        <Section title="Section 1 — Executive Summary">
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
            <KpiCard label="Total SaaS Apps" value={String(summary.totalApps)} />
            <KpiCard
              label="Monthly Spend"
              value={fmtMoney(summary.totalSpend)}
              colorClass="text-accent"
            />
            <KpiCard
              label="Active Employees"
              value={String(summary.activeEmployees)}
              colorClass="text-accent"
            />
            <KpiCard
              label="Pending Offboardings"
              value={String(summary.pendingOffboardings)}
              colorClass={summary.pendingOffboardings > 0 ? "text-danger" : "text-primary"}
            />
            <KpiCard
              label="Expiring Contracts ≤30d"
              value={String(summary.expiringContracts)}
              colorClass={summary.expiringContracts > 0 ? "text-danger" : "text-primary"}
            />
            <KpiCard
              label="Unresolved Alerts"
              value={String(summary.unresolvedAlerts)}
              colorClass={summary.unresolvedAlerts > 0 ? "text-warning" : "text-primary"}
            />
          </div>
        </Section>

        {/* Sections 2–6 */}
        <AppInventory apps={apps} />
        <AccessControl apps={apps} />
        <OffboardingCompliance offboardings={offboardings} />
        <ContractRenewals contracts={contracts} />
        <UnresolvedAlerts alerts={alerts} />

        {/* Footer */}
        <div className="print-section mt-12 pt-6 border-t border-border flex items-center justify-between text-xs text-muted">
          <span>Generated by SaaS-Scrub • Confidential</span>
          <span>{new Date(generatedAt).toISOString()}</span>
        </div>
      </div>
    </div>
  );
}
