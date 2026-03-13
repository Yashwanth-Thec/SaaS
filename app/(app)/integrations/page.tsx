import { redirect } from "next/navigation";
import { requireSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { Header } from "@/components/layout/Header";
import { IntegrationsClient } from "./IntegrationsClient";

export const metadata = { title: "Integrations" };

export default async function IntegrationsPage() {
  let session;
  try { session = await requireSession(); }
  catch { redirect("/login"); }

  const integrations = await db.integration.findMany({
    where: { orgId: session.orgId },
  });

  const connected = Object.fromEntries(
    integrations.map((i) => [i.type, {
      status:     i.status,
      lastSyncAt: i.lastSyncAt?.toISOString() ?? null,
      syncCount:  i.syncCount,
      lastError:  i.lastError,
    }])
  );

  return (
    <>
      <Header
        title="Integrations"
        subtitle="Connect your tools to automatically discover and audit your SaaS stack"
      />
      <IntegrationsClient connected={connected} />
    </>
  );
}
