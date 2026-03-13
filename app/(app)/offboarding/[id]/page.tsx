import { notFound, redirect } from "next/navigation";
import { requireSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { Header } from "@/components/layout/Header";
import { OffboardingDetailClient } from "./OffboardingDetailClient";
import { calcProgress } from "@/lib/offboarding";
import type { OffboardingStep } from "@/lib/offboarding";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const o = await db.offboarding.findUnique({
    where: { id },
    include: { employee: { select: { name: true } } },
  });
  return { title: o ? `Offboarding — ${o.employee.name}` : "Offboarding" };
}

export default async function OffboardingDetailPage({ params }: { params: Promise<{ id: string }> }) {
  let session;
  try { session = await requireSession(); }
  catch { redirect("/login"); }

  const { id } = await params;

  const offboarding = await db.offboarding.findFirst({
    where:   { id, orgId: session.orgId },
    include: {
      employee:  true,
      createdBy: { select: { id: true, name: true } },
    },
  });

  if (!offboarding) notFound();

  const steps    = JSON.parse(offboarding.steps) as OffboardingStep[];
  const progress = calcProgress(steps);

  const serialized = {
    id:          offboarding.id,
    status:      offboarding.status,
    notes:       offboarding.notes,
    createdAt:   offboarding.createdAt.toISOString(),
    completedAt: offboarding.completedAt?.toISOString() ?? null,
    createdBy:   offboarding.createdBy,
    employee: {
      ...offboarding.employee,
      createdAt: offboarding.employee.createdAt.toISOString(),
      updatedAt: offboarding.employee.updatedAt.toISOString(),
      startDate: offboarding.employee.startDate?.toISOString() ?? null,
      endDate:   offboarding.employee.endDate?.toISOString()   ?? null,
    },
    steps,
    progress,
  };

  return (
    <>
      <Header
        title={`Offboarding — ${offboarding.employee.name}`}
        subtitle={`${progress.done} of ${progress.total} steps complete · ${progress.pct}%`}
      />
      <OffboardingDetailClient offboarding={serialized} />
    </>
  );
}
