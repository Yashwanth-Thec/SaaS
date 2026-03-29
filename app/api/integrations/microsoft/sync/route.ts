import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { syncMicrosoftEntraID } from "@/lib/integrations/microsoft";
import { runSync } from "@/lib/integrations/sync-engine";
import { db } from "@/lib/db";

/**
 * POST /api/integrations/microsoft/sync
 * Manually trigger a re-sync of Microsoft Entra ID data.
 */
export async function POST() {
  try {
    const session = await requireSession();
    const { orgId } = session;

    const integration = await db.integration.findUnique({
      where: { orgId_type: { orgId, type: "azure_ad" } },
    });

    if (!integration || integration.status !== "connected") {
      return NextResponse.json(
        { error: "Microsoft Entra ID not connected" },
        { status: 400 }
      );
    }

    // Demo / seeded account — no real tokens stored
    if (!integration.config) {
      await db.integration.update({
        where: { id: integration.id },
        data:  { lastSyncAt: new Date(), syncCount: { increment: 1 } },
      });
      return NextResponse.json({ ok: true, demo: true, result: { employees: { upserted: 0 }, apps: { upserted: 0 } } });
    }

    await db.integration.update({
      where: { id: integration.id },
      data:  { status: "syncing" },
    });

    const discovered = await syncMicrosoftEntraID(orgId);
    const result     = await runSync(orgId, discovered);

    await db.integration.update({
      where: { id: integration.id },
      data: {
        status:    "connected",
        lastSyncAt: new Date(),
        syncCount: { increment: 1 },
        lastError: null,
      },
    });

    return NextResponse.json({ ok: true, result });
  } catch (err) {
    console.error("[microsoft/sync]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Sync failed" },
      { status: 500 }
    );
  }
}
