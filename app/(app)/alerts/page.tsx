import { redirect } from "next/navigation";
import { requireSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { Header } from "@/components/layout/Header";
import { AlertsClient } from "./AlertsClient";

export const metadata = { title: "Alerts" };

export default async function AlertsPage() {
  let session;
  try { session = await requireSession(); }
  catch { redirect("/login"); }

  const alerts = await db.alert.findMany({
    where:   { orgId: session.orgId, isDismissed: false },
    orderBy: { createdAt: "desc" },
  });

  const weightedAlerts = [...alerts].sort((a, b) => {
    const w: Record<string, number> = { critical: 0, warning: 1, info: 2 };
    return (w[a.severity] ?? 3) - (w[b.severity] ?? 3);
  });

  const serialized = weightedAlerts.map((a) => ({
    ...a,
    createdAt: a.createdAt.toISOString(),
  }));

  const critical = alerts.filter((a) => a.severity === "critical").length;
  const warning  = alerts.filter((a) => a.severity === "warning").length;

  return (
    <>
      <Header
        title="Alerts"
        subtitle={`${critical} critical · ${warning} warnings · ${alerts.length} total`}
      />
      <AlertsClient initialAlerts={serialized} />
    </>
  );
}
