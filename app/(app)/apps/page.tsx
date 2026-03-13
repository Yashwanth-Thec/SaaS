import { redirect } from "next/navigation";
import { requireSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { Header } from "@/components/layout/Header";
import { AppsClient } from "./AppsClient";

export const metadata = { title: "SaaS Stack" };

export default async function AppsPage() {
  let session;
  try { session = await requireSession(); }
  catch { redirect("/login"); }

  const apps = await db.saasApp.findMany({
    where:   { orgId: session.orgId },
    include: { contract: true },
    orderBy: { monthlySpend: "desc" },
  });

  const totalSpend    = apps.reduce((s, a) => s + a.monthlySpend, 0);
  const zombieApps    = apps.filter((a) => a.status === "zombie");
  const potentialSave = zombieApps.reduce((s, a) => s + a.monthlySpend, 0);
  const unusedSeats   = apps.reduce((s, a) => s + Math.max(0, a.totalSeats - a.activeSeats), 0);

  return (
    <>
      <Header
        title="SaaS Stack"
        subtitle={`${apps.length} apps · ${formatMoney(totalSpend)}/mo total spend`}
      />
      <AppsClient
        initialApps={apps.map(serializeApp)}
        stats={{ totalSpend, zombieCount: zombieApps.length, potentialSave, unusedSeats }}
      />
    </>
  );
}

function formatMoney(n: number) {
  if (n >= 1000) return `$${(n / 1000).toFixed(1)}k`;
  return `$${n}`;
}

// Serialize Dates for client transfer
function serializeApp(app: ReturnType<typeof Object.assign>) {
  return {
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
  };
}
