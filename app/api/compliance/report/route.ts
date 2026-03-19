import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { db } from "@/lib/db";

// ─── Types ────────────────────────────────────────────────────────────────────

interface OffboardingStep {
  id: string;
  label: string;
  completed: boolean;
}

// ─── Helper ───────────────────────────────────────────────────────────────────

function parseSteps(raw: string): OffboardingStep[] {
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed as OffboardingStep[];
  } catch {
    return [];
  }
}

function daysUntil(date: Date): number {
  return Math.ceil((date.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}

// ─── Route ────────────────────────────────────────────────────────────────────

export async function GET() {
  try {
    const session = await requireSession();
    const { orgId } = session;

    const [org, apps, employees, offboardings, alerts, contracts] =
      await Promise.all([
        db.organization.findUniqueOrThrow({
          where: { id: orgId },
          select: { name: true, plan: true, slug: true },
        }),
        db.saasApp.findMany({
          where: { orgId },
          include: {
            contract: true,
            appAccess: { include: { employee: true } },
          },
          orderBy: { name: "asc" },
        }),
        db.employee.findMany({
          where: { orgId },
          include: { appAccess: { include: { app: true } } },
          orderBy: { name: "asc" },
        }),
        db.offboarding.findMany({
          where: { orgId },
          include: { employee: true },
          orderBy: { createdAt: "desc" },
        }),
        db.alert.findMany({
          where: { orgId, isRead: false },
          orderBy: { createdAt: "desc" },
        }),
        db.contract.findMany({
          where: { orgId },
          include: { app: true },
          orderBy: { renewalDate: "asc" },
        }),
      ]);

    const now = new Date();
    const in30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const totalSpend = apps.reduce((sum, a) => sum + a.monthlySpend, 0);
    const activeEmployees = employees.filter((e) => e.status === "active").length;
    const pendingOffboardings = offboardings.filter(
      (o) => o.status !== "completed"
    ).length;
    const expiringContracts = contracts.filter(
      (c) => c.renewalDate <= in30Days && c.renewalDate >= now
    ).length;

    return NextResponse.json({
      org,
      generatedAt: now.toISOString(),
      apps,
      employees,
      offboardings,
      contracts,
      alerts,
      summary: {
        totalApps: apps.length,
        totalSpend,
        activeEmployees,
        pendingOffboardings,
        expiringContracts,
        unresolvedAlerts: alerts.length,
      },
    });
  } catch {
    return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  }
}
