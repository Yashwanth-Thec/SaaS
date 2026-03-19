'use client';
import { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  Search, Calendar, CheckCircle2, XCircle,
  AlertTriangle, Clock, ArrowUpDown,
} from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { formatCurrency, CATEGORY_COLORS, type AppCategory } from '@/lib/utils';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ContractRow {
  id: string;
  vendor: string;
  value: number;
  billingCycle: string;
  renewalDate: string;
  autoRenews: boolean;
  noticeDays: number;
  status: string;
  daysUntilRenewal: number;
  app: { id: string; name: string; category: string; monthlySpend: number };
}

interface Props {
  contracts: ContractRow[];
  totalAnnualValue: number;
  autoRenewCount: number;
  expiringCount: number;
  inNoticeCount: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function cycleBadgeVariant(cycle: string): 'default' | 'info' | 'warning' | 'neutral' {
  if (cycle === 'monthly') return 'warning';
  if (cycle === 'annual') return 'info';
  if (cycle === 'multi_year') return 'neutral';
  return 'default';
}

function cycleLabel(cycle: string) {
  if (cycle === 'monthly') return 'Monthly';
  if (cycle === 'annual') return 'Annual';
  if (cycle === 'multi_year') return 'Multi-year';
  return cycle;
}

// ─── Days pill ────────────────────────────────────────────────────────────────

function DaysPill({ days }: { days: number }) {
  if (days <= 30) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-mono font-semibold bg-danger/10 text-danger border border-danger/20">
        <AlertTriangle className="w-3 h-3" />
        {days}d
      </span>
    );
  }
  if (days <= 60) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-mono font-semibold bg-warning/10 text-warning border border-warning/20">
        <Clock className="w-3 h-3" />
        {days}d
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-mono font-semibold bg-accent/10 text-accent border border-accent/20">
      <CheckCircle2 className="w-3 h-3" />
      {days}d
    </span>
  );
}

// ─── App logo ─────────────────────────────────────────────────────────────────

function AppLogo({ name, category }: { name: string; category: string }) {
  const color = CATEGORY_COLORS[category as AppCategory] ?? '#8892a0';
  return (
    <div
      className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm flex-shrink-0"
      style={{ background: `${color}18`, color, border: `1px solid ${color}28` }}
    >
      {name.charAt(0).toUpperCase()}
    </div>
  );
}

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
    <Card className="p-4 flex flex-col gap-1">
      <span className={`text-2xl font-mono font-bold ${colorClass ?? 'text-primary'}`}>
        {value}
      </span>
      <span className="text-xs text-muted">{label}</span>
    </Card>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

const SORT_OPTIONS = [
  { value: 'renewal', label: 'Renewal date' },
  { value: 'value',   label: 'Annual value' },
  { value: 'name',    label: 'App name' },
];

export function ContractsClient({
  contracts,
  totalAnnualValue,
  autoRenewCount,
  expiringCount,
  inNoticeCount,
}: Props) {
  const [search, setSearch] = useState('');
  const [sort, setSort]     = useState('renewal');

  const upcoming3160 = useMemo(
    () => contracts.filter((c) => c.daysUntilRenewal > 30 && c.daysUntilRenewal <= 60).length,
    [contracts]
  );

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    const rows = contracts.filter(
      (c) =>
        c.app.name.toLowerCase().includes(q) ||
        c.vendor.toLowerCase().includes(q)
    );
    return [...rows].sort((a, b) => {
      if (sort === 'renewal') return a.daysUntilRenewal - b.daysUntilRenewal;
      if (sort === 'value') return b.value - a.value;
      if (sort === 'name') return a.app.name.localeCompare(b.app.name);
      return 0;
    });
  }, [contracts, search, sort]);

  return (
    <div className="p-6 space-y-6 animate-fade-in">

      {/* ── KPI row ── */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
        <KpiCard
          label="Total Annual Value"
          value={formatCurrency(totalAnnualValue)}
        />
        <KpiCard
          label="Auto-Renewing Contracts"
          value={String(autoRenewCount)}
          colorClass="text-accent"
        />
        <KpiCard
          label="Expiring in 30 days"
          value={String(expiringCount)}
          colorClass={expiringCount > 0 ? 'text-danger' : 'text-primary'}
        />
        <KpiCard
          label="Expiring in 31–60 days"
          value={String(upcoming3160)}
          colorClass={upcoming3160 > 0 ? 'text-warning' : 'text-primary'}
        />
      </div>

      {/* ── In-notice alert banner ── */}
      {inNoticeCount > 0 && (
        <div className="flex items-center gap-3 p-4 rounded-lg border border-warning/30 bg-warning/5 text-warning text-sm">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          <span>
            <strong>{inNoticeCount} auto-renewing contract{inNoticeCount > 1 ? 's are' : ' is'}</strong> inside the notice window — action required to cancel.
          </span>
        </div>
      )}

      {/* ── Table section ── */}
      <div className="card">
        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 border-b border-border">
          <h2 className="font-display font-semibold text-primary text-base">
            All Contracts
            <span className="ml-2 text-muted text-sm font-normal">({filtered.length})</span>
          </h2>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:flex-none">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted" />
              <input
                type="text"
                placeholder="Search app or vendor…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 pr-3 py-1.5 text-sm bg-surface border border-border rounded-md text-primary placeholder:text-muted focus:outline-none focus:border-accent/50 w-full sm:w-52"
              />
            </div>
            <div className="relative">
              <ArrowUpDown className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted pointer-events-none" />
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value)}
                className="pl-8 pr-3 py-1.5 text-sm bg-surface border border-border rounded-md text-primary focus:outline-none focus:border-accent/50 appearance-none cursor-pointer"
              >
                {SORT_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Table */}
        {filtered.length === 0 ? (
          <EmptyState hasSearch={search.length > 0} />
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table w-full">
              <thead>
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted uppercase tracking-wide">App</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted uppercase tracking-wide">Vendor</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted uppercase tracking-wide">Cycle</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-muted uppercase tracking-wide">Annual Value</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted uppercase tracking-wide">Renewal Date</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-muted uppercase tracking-wide">Days Left</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted uppercase tracking-wide">Auto-Renew</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted uppercase tracking-wide">Notice</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((c) => (
                  <ContractRow key={c.id} contract={c} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Contract row ─────────────────────────────────────────────────────────────

function ContractRow({ contract: c }: { contract: ContractRow }) {
  const isInNotice = c.autoRenews && c.daysUntilRenewal <= c.noticeDays;

  return (
    <tr className="border-t border-border hover:bg-elevated transition-colors">
      {/* App */}
      <td className="px-4 py-3">
        <div className="flex items-center gap-2.5">
          <AppLogo name={c.app.name} category={c.app.category} />
          <div className="min-w-0">
            <div className="font-display font-semibold text-primary text-sm truncate">
              {c.app.name}
            </div>
            <span
              className="text-xs capitalize"
              style={{ color: CATEGORY_COLORS[c.app.category as AppCategory] ?? '#8892a0' }}
            >
              {c.app.category}
            </span>
          </div>
        </div>
      </td>

      {/* Vendor */}
      <td className="px-4 py-3 text-secondary text-sm whitespace-nowrap">{c.vendor}</td>

      {/* Billing cycle */}
      <td className="px-4 py-3">
        <Badge variant={cycleBadgeVariant(c.billingCycle)} size="sm">
          {cycleLabel(c.billingCycle)}
        </Badge>
      </td>

      {/* Annual value */}
      <td className="px-4 py-3 text-right">
        <span className="font-mono text-sm text-accent font-semibold">
          {formatCurrency(c.value)}
        </span>
      </td>

      {/* Renewal date */}
      <td className="px-4 py-3 text-secondary text-sm whitespace-nowrap">
        {formatDate(c.renewalDate)}
      </td>

      {/* Days pill */}
      <td className="px-4 py-3 text-center">
        <DaysPill days={c.daysUntilRenewal} />
      </td>

      {/* Auto-renew */}
      <td className="px-4 py-3">
        {c.autoRenews ? (
          isInNotice ? (
            <Badge variant="warning" size="sm">Auto-renews ⚠</Badge>
          ) : (
            <span className="inline-flex items-center gap-1 text-xs text-accent">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Auto-renews
            </span>
          )
        ) : (
          <span className="inline-flex items-center gap-1 text-xs text-muted">
            <XCircle className="w-3.5 h-3.5" />
            Manual
          </span>
        )}
      </td>

      {/* Notice */}
      <td className="px-4 py-3 text-secondary text-xs whitespace-nowrap">
        {c.noticeDays}-day notice
      </td>
    </tr>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyState({ hasSearch }: { hasSearch: boolean }) {
  if (hasSearch) {
    return (
      <div className="p-12 text-center text-muted text-sm">
        No contracts match your search.
      </div>
    );
  }
  return (
    <div className="p-12 flex flex-col items-center gap-4 text-center">
      <div className="w-12 h-12 rounded-full bg-surface flex items-center justify-center">
        <Calendar className="w-6 h-6 text-muted" />
      </div>
      <div>
        <p className="font-display font-semibold text-primary mb-1">No contracts tracked yet</p>
        <p className="text-sm text-muted mb-4">Add contracts to your apps to track renewal dates and auto-renew alerts.</p>
        <Link href="/apps">
          <Button variant="secondary" size="sm">Go to SaaS Stack</Button>
        </Link>
      </div>
    </div>
  );
}
