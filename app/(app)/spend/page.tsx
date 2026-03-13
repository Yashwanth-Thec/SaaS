import { redirect } from "next/navigation";
import { requireSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { Header } from "@/components/layout/Header";
import { SpendClient } from "./SpendClient";

export const metadata = { title: "Spend" };

export default async function SpendPage() {
  let session;
  try { session = await requireSession(); }
  catch { redirect("/login"); }

  const { orgId } = session;

  const [spendRecords, apps] = await Promise.all([
    db.spendRecord.findMany({
      where: { orgId },
      orderBy: { date: "asc" },
      include: { app: { select: { name: true, category: true } } },
    }),
    db.saasApp.findMany({
      where: { orgId },
      orderBy: { monthlySpend: "desc" },
    }),
  ]);

  // Build 6-month timeline
  const now = new Date();
  const months = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
    return { label: d.toLocaleString("default", { month: "short" }), year: d.getFullYear(), month: d.getMonth(), total: 0 };
  });
  for (const r of spendRecords) {
    const d = new Date(r.date);
    const bucket = months.find((m) => m.year === d.getFullYear() && m.month === d.getMonth());
    if (bucket) bucket.total += r.amount;
  }
  if (spendRecords.length === 0) {
    const total = apps.reduce((s, a) => s + a.monthlySpend, 0);
    months[months.length - 1].total = total;
  }

  // Category breakdown
  const byCategory: Record<string, number> = {};
  for (const a of apps) {
    byCategory[a.category] = (byCategory[a.category] ?? 0) + a.monthlySpend;
  }
  const categoryData = Object.entries(byCategory)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  const totalMonthly = apps.reduce((s, a) => s + a.monthlySpend, 0);
  const prevMonth    = months[months.length - 2]?.total ?? 0;
  const currMonth    = months[months.length - 1]?.total ?? totalMonthly;
  const momChange    = prevMonth > 0 ? ((currMonth - prevMonth) / prevMonth) * 100 : 0;

  return (
    <>
      <Header title="Spend" subtitle="SaaS spend breakdown and trends" />
      <SpendClient
        timeline={months}
        categoryData={categoryData}
        topApps={apps.slice(0, 10).map((a) => ({ id: a.id, name: a.name, category: a.category, monthlySpend: a.monthlySpend, annualSpend: a.annualSpend }))}
        totalMonthly={totalMonthly}
        momChange={momChange}
      />
    </>
  );
}
