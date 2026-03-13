"use client";
import Link from "next/link";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis,
  Tooltip, ResponsiveContainer, Cell,
} from "recharts";
import { TrendingUp, TrendingDown, ArrowRight } from "lucide-react";
import { Card, CardHeader, CardTitle, CardBody } from "@/components/ui/Card";
import { formatCurrency, CATEGORY_COLORS, type AppCategory } from "@/lib/utils";

interface Props {
  timeline:     { label: string; total: number }[];
  categoryData: { name: string; value: number }[];
  topApps:      { id: string; name: string; category: string; monthlySpend: number; annualSpend: number }[];
  totalMonthly: number;
  momChange:    number;
}

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: { value: number }[]; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-elevated border border-border rounded px-3 py-2 text-xs shadow-card">
      <div className="text-muted mb-1">{label}</div>
      <div className="font-mono font-bold text-primary">{formatCurrency(payload[0].value)}</div>
    </div>
  );
}

export function SpendClient({ timeline, categoryData, topApps, totalMonthly, momChange }: Props) {
  const isUp = momChange > 0;

  return (
    <div className="p-6 space-y-6 max-w-5xl">
      {/* Top stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-5">
          <div className="text-xs text-muted uppercase tracking-wider mb-2">Monthly Run Rate</div>
          <div className="font-mono font-bold text-3xl text-primary">{formatCurrency(totalMonthly)}</div>
          <div className="flex items-center gap-1.5 mt-2">
            {isUp
              ? <TrendingUp className="w-3.5 h-3.5 text-danger" />
              : <TrendingDown className="w-3.5 h-3.5 text-accent" />
            }
            <span className={`text-xs font-medium ${isUp ? "text-danger" : "text-accent"}`}>
              {isUp ? "+" : ""}{momChange.toFixed(1)}% vs last month
            </span>
          </div>
        </Card>
        <Card className="p-5">
          <div className="text-xs text-muted uppercase tracking-wider mb-2">Annual Projection</div>
          <div className="font-mono font-bold text-3xl text-primary">{formatCurrency(totalMonthly * 12, { compact: true })}</div>
          <div className="text-xs text-secondary mt-2">Based on current run rate</div>
        </Card>
        <Card className="p-5">
          <div className="text-xs text-muted uppercase tracking-wider mb-2">Per Employee / mo</div>
          <div className="font-mono font-bold text-3xl text-primary">
            {topApps.length > 0 ? formatCurrency(Math.round(totalMonthly / Math.max(1, topApps.length * 3))) : "—"}
          </div>
          <div className="text-xs text-secondary mt-2">Approximate blended cost</div>
        </Card>
      </div>

      {/* Spend trend */}
      <Card>
        <CardHeader>
          <CardTitle>6-Month Trend</CardTitle>
          <span className="text-xs text-muted font-mono">{formatCurrency(totalMonthly)}/mo current</span>
        </CardHeader>
        <CardBody className="pt-0">
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={timeline} margin={{ left: -10, right: 4 }}>
              <defs>
                <linearGradient id="spendGradSpend" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%"   stopColor="#00d97e" stopOpacity={0.25} />
                  <stop offset="100%" stopColor="#00d97e" stopOpacity={0}    />
                </linearGradient>
              </defs>
              <XAxis dataKey="label" tick={{ fill: "#4a5568", fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "#4a5568", fontSize: 11 }} axisLine={false} tickLine={false}
                tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="total" stroke="#00d97e" strokeWidth={2}
                fill="url(#spendGradSpend)" dot={false}
                activeDot={{ r: 4, fill: "#00d97e", stroke: "#070809", strokeWidth: 2 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </CardBody>
      </Card>

      {/* Category + top apps */}
      <div className="grid grid-cols-1 xl:grid-cols-5 gap-4">
        {/* Category bar chart */}
        <Card className="xl:col-span-2">
          <CardHeader><CardTitle>By Category</CardTitle></CardHeader>
          <CardBody className="pt-0">
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={categoryData} layout="vertical" margin={{ left: 8, right: 8 }}>
                <XAxis type="number" tick={{ fill: "#4a5568", fontSize: 10 }} axisLine={false} tickLine={false}
                  tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                <YAxis type="category" dataKey="name" tick={{ fill: "#8892a0", fontSize: 11 }} axisLine={false} tickLine={false} width={80} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="value" radius={[0, 3, 3, 0]}>
                  {categoryData.map((entry) => (
                    <Cell key={entry.name} fill={CATEGORY_COLORS[entry.name as AppCategory] ?? "#4a5568"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardBody>
        </Card>

        {/* Top apps list */}
        <Card className="xl:col-span-3">
          <CardHeader>
            <CardTitle>Top Apps by Spend</CardTitle>
            <Link href="/apps" className="text-xs text-accent hover:text-accent-hover flex items-center gap-1">
              All apps <ArrowRight className="w-3 h-3" />
            </Link>
          </CardHeader>
          <CardBody className="pt-0 space-y-2">
            {topApps.map((app, i) => {
              const pct = totalMonthly > 0 ? (app.monthlySpend / totalMonthly) * 100 : 0;
              const color = CATEGORY_COLORS[app.category as AppCategory] ?? "#4a5568";
              return (
                <Link key={app.id} href={`/apps/${app.id}`} className="flex items-center gap-3 group">
                  <div className="text-2xs font-mono text-muted w-4 text-right">{i + 1}</div>
                  <div
                    className="w-6 h-6 rounded flex items-center justify-center text-2xs font-bold flex-shrink-0"
                    style={{ background: `${color}18`, color }}
                  >
                    {app.name.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="text-xs text-primary font-medium group-hover:text-accent transition-colors truncate">
                        {app.name}
                      </span>
                      <span className="font-mono text-xs text-primary flex-shrink-0 ml-2">
                        {formatCurrency(app.monthlySpend)}
                      </span>
                    </div>
                    <div className="util-bar">
                      <div className="util-bar-fill" style={{ width: `${pct}%`, background: color }} />
                    </div>
                  </div>
                  <span className="text-2xs text-muted w-8 text-right">{pct.toFixed(0)}%</span>
                </Link>
              );
            })}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
