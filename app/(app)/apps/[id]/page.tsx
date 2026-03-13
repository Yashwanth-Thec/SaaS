import { notFound, redirect } from "next/navigation";
import { requireSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { Header } from "@/components/layout/Header";
import { AppDetailClient } from "./AppDetailClient";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const app = await db.saasApp.findUnique({ where: { id }, select: { name: true } });
  return { title: app?.name ?? "App Detail" };
}

export default async function AppDetailPage({ params }: { params: Promise<{ id: string }> }) {
  let session;
  try { session = await requireSession(); }
  catch { redirect("/login"); }

  const { id } = await params;

  const app = await db.saasApp.findFirst({
    where:   { id, orgId: session.orgId },
    include: {
      contract: true,
      appAccess: {
        include: { employee: true },
        orderBy: { lastLoginAt: "desc" },
        take: 50,
      },
      spendRecords: {
        orderBy: { date: "asc" },
        take: 12,
      },
    },
  });

  if (!app) notFound();

  // Serialize dates
  const serialized = {
    ...app,
    createdAt:      app.createdAt.toISOString(),
    updatedAt:      app.updatedAt.toISOString(),
    lastDetectedAt: app.lastDetectedAt.toISOString(),
    contract: app.contract ? {
      ...app.contract,
      startDate:   app.contract.startDate.toISOString(),
      renewalDate: app.contract.renewalDate.toISOString(),
      createdAt:   app.contract.createdAt.toISOString(),
      updatedAt:   app.contract.updatedAt.toISOString(),
    } : null,
    appAccess: app.appAccess.map((a) => ({
      ...a,
      createdAt:   a.createdAt.toISOString(),
      updatedAt:   a.updatedAt.toISOString(),
      lastLoginAt: a.lastLoginAt?.toISOString() ?? null,
      employee: {
        ...a.employee,
        createdAt: a.employee.createdAt.toISOString(),
        updatedAt: a.employee.updatedAt.toISOString(),
        startDate: a.employee.startDate?.toISOString() ?? null,
        endDate:   a.employee.endDate?.toISOString() ?? null,
      },
    })),
    spendRecords: app.spendRecords.map((s) => ({
      ...s,
      date:      s.date.toISOString(),
      createdAt: s.createdAt.toISOString(),
    })),
  };

  return (
    <>
      <Header title={app.name} subtitle={`${app.category} · ${app.source} · last seen ${new Date(app.lastDetectedAt).toLocaleDateString()}`} />
      <AppDetailClient app={serialized} />
    </>
  );
}
