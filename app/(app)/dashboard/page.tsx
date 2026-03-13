import { redirect } from "next/navigation";
import { requireSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { Header } from "@/components/layout/Header";
import { DashboardClient } from "./DashboardClient";

export const metadata = { title: "Dashboard" };

async function getDashboardData(orgId: string) {
  const [apps, employees, alerts, spendRecords, integrations] = await Promise.all([
    db.saasApp.findMany({
      where: { orgId },
      include: { contract: true },
      orderBy: { monthlySpend: "desc" },
    }),
    db.employee.count({ where: { orgId, status: "active" } }),
    db.alert.findMany({
      where: { orgId, isDismissed: false },
      orderBy: { createdAt: "desc" },
      take: 8,
    }),
    db.spendRecord.findMany({
      where: { orgId },
      orderBy: { date: "asc" },
    }),
    db.integration.findMany({ where: { orgId } }),
  ]);

  const totalMonthlySpend = apps.reduce((s, a) => s + a.monthlySpend, 0);
  const zombieApps        = apps.filter(
    (a) => a.totalSeats > 0 && a.activeSeats / a.totalSeats < 0.3
  );
  const potentialSavings  = zombieApps.reduce((s, a) => s + a.monthlySpend, 0);
  const totalApps         = apps.length;
  const unusedSeats       = apps.reduce((s, a) => s + Math.max(0, a.totalSeats - a.activeSeats), 0);

  // Build 6-month spend timeline from spend records
  const now   = new Date();
  const months = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
    return {
      label: d.toLocaleString("default", { month: "short" }),
      year:  d.getFullYear(),
      month: d.getMonth(),
      total: 0,
    };
  });
  for (const r of spendRecords) {
    const d = new Date(r.date);
    const bucket = months.find(
      (m) => m.year === d.getFullYear() && m.month === d.getMonth()
    );
    if (bucket) bucket.total += r.amount;
  }
  // If no spend records yet, show app spend as current month placeholder
  if (spendRecords.length === 0 && totalMonthlySpend > 0) {
    months[months.length - 1].total = totalMonthlySpend;
  }

  // Category breakdown
  const byCategory: Record<string, number> = {};
  for (const a of apps) {
    byCategory[a.category] = (byCategory[a.category] ?? 0) + a.monthlySpend;
  }

  return {
    totalMonthlySpend,
    potentialSavings,
    totalApps,
    activeEmployees: employees,
    unusedSeats,
    zombieCount: zombieApps.length,
    alerts,
    spendTimeline: months,
    categoryBreakdown: Object.entries(byCategory).map(([name, value]) => ({ name, value })),
    topApps: apps.slice(0, 8),
    integrations,
    hasData: apps.length > 0,
  };
}

export default async function DashboardPage() {
  let session;
  try { session = await requireSession(); }
  catch { redirect("/login"); }

  const data = await getDashboardData(session.orgId);
  return (
    <>
      <Header
        title="Dashboard"
        subtitle={`Good ${getGreeting()} — here's your SaaS spend overview`}
      />
      <DashboardClient data={data} />
    </>
  );
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "morning";
  if (h < 18) return "afternoon";
  return "evening";
}
