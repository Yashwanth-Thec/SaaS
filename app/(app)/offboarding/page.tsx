import { redirect } from "next/navigation";
import { requireSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { Header } from "@/components/layout/Header";
import { OffboardingClient } from "./OffboardingClient";
import type { OffboardingStep } from "@/lib/offboarding";

export const metadata = { title: "Offboarding" };

export default async function OffboardingPage() {
  let session;
  try { session = await requireSession(); }
  catch { redirect("/login"); }

  const { orgId } = session;

  const [employees, offboardings] = await Promise.all([
    db.employee.findMany({
      where:   { orgId, status: "active" },
      include: {
        appAccess: {
          where:   { isActive: true },
          include: { app: { select: { name: true, monthlySpend: true, totalSeats: true } } },
        },
      },
      orderBy: { name: "asc" },
    }),
    db.offboarding.findMany({
      where:   { orgId },
      include: {
        employee:  { select: { id: true, name: true, email: true, department: true, jobTitle: true } },
        createdBy: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
  ]);

  // Serialize + compute per-employee app count and potential savings
  const serializedEmployees = employees.map((e) => ({
    id:         e.id,
    name:       e.name,
    email:      e.email,
    department: e.department,
    jobTitle:   e.jobTitle,
    appCount:   e.appAccess.length,
    monthlySavings: e.appAccess.reduce((sum, a) => {
      const perSeat = a.app.totalSeats > 0 ? a.app.monthlySpend / a.app.totalSeats : 0;
      return sum + perSeat;
    }, 0),
    apps: e.appAccess.map((a) => a.app.name),
  }));

  const serializedOffboardings = offboardings.map((o) => {
    const steps = JSON.parse(o.steps) as OffboardingStep[];
    const done  = steps.filter((s) => s.status === "done" || s.status === "skipped").length;
    return {
      id:          o.id,
      status:      o.status,
      createdAt:   o.createdAt.toISOString(),
      completedAt: o.completedAt?.toISOString() ?? null,
      stepsDone:   done,
      stepsTotal:  steps.length,
      employee:    o.employee,
      createdBy:   o.createdBy,
    };
  });

  const stats = {
    activeEmployees:    employees.length,
    inProgress:         offboardings.filter((o) => o.status === "in_progress").length,
    completedThisMonth: offboardings.filter((o) => {
      if (o.status !== "completed" || !o.completedAt) return false;
      const d = new Date(o.completedAt);
      const n = new Date();
      return d.getMonth() === n.getMonth() && d.getFullYear() === n.getFullYear();
    }).length,
  };

  return (
    <>
      <Header
        title="Offboarding"
        subtitle={`${stats.inProgress} in progress · ${stats.completedThisMonth} completed this month`}
      />
      <OffboardingClient
        employees={serializedEmployees}
        offboardings={serializedOffboardings}
        stats={stats}
      />
    </>
  );
}
