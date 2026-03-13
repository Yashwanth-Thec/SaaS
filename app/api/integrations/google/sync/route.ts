import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { syncGoogleWorkspace } from "@/lib/integrations/google";
import { runSync } from "@/lib/integrations/sync-engine";
import { db } from "@/lib/db";

/**
 * POST /api/integrations/google/sync
 * Manually trigger a re-sync of Google Workspace data.
 */
export async function POST() {
  try {
    const session = await requireSession();
    const { orgId } = session;

    const integration = await db.integration.findUnique({
      where: { orgId_type: { orgId, type: "google_workspace" } },
    });

    if (!integration || integration.status !== "connected") {
      return NextResponse.json({ error: "Google Workspace not connected" }, { status: 400 });
    }

    await db.integration.update({
      where: { id: integration.id },
      data:  { status: "syncing" },
    });

    const discovered = await syncGoogleWorkspace(orgId);
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
    console.error("[google/sync]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Sync failed" },
      { status: 500 }
    );
  }
}
