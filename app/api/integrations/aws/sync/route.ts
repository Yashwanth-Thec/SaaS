import { NextResponse } from "next/server";
import { syncAws } from "@/lib/integrations/aws";
import { runSync } from "@/lib/integrations/sync-engine";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/auth";

/**
 * POST /api/integrations/aws/sync
 *
 * Re-runs the AWS sync for the authenticated org.
 */
export async function POST() {
  const session   = await requireSession();
  const { orgId } = session;

  const integration = await db.integration.findUnique({
    where: { orgId_type: { orgId, type: "aws" } },
  });

  if (!integration || integration.status === "pending") {
    return NextResponse.json({ error: "AWS not connected" }, { status: 400 });
  }

  await db.integration.update({
    where: { orgId_type: { orgId, type: "aws" } },
    data:  { status: "syncing" },
  });

  try {
    const discovered = await syncAws(orgId);
    const result     = await runSync(orgId, discovered);

    await db.integration.update({
      where: { orgId_type: { orgId, type: "aws" } },
      data: {
        status:     "connected",
        lastSyncAt: new Date(),
        syncCount:  { increment: 1 },
        lastError:  null,
      },
    });

    return NextResponse.json({ success: true, result });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[aws/sync]", err);

    await db.integration.update({
      where: { orgId_type: { orgId, type: "aws" } },
      data:  { status: "error", lastError: message },
    }).catch(() => {});

    // Return a generic message — raw AWS errors can leak account IDs and ARN fragments
    return NextResponse.json({ error: "Sync failed. Check server logs for details." }, { status: 500 });
  }
}
