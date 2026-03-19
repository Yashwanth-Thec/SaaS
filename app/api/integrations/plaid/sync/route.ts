import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { syncPlaidTransactions } from "@/lib/integrations/plaid";
import { runSync } from "@/lib/integrations/sync-engine";
import { db } from "@/lib/db";

/**
 * POST /api/integrations/plaid/sync
 * Pull latest 90 days of transactions and re-process.
 */
export async function POST() {
  try {
    const session = await requireSession();
    const { orgId } = session;

    const integration = await db.integration.findUnique({
      where: { orgId_type: { orgId, type: "plaid" } },
    });

    if (!integration?.config) {
      // Demo/seeded account — no real credentials, return mock success
      await db.integration.update({
        where: { id: integration!.id },
        data: { lastSyncAt: new Date(), syncCount: { increment: 1 } },
      });
      return NextResponse.json({ ok: true, demo: true, result: { apps: { upserted: 0 }, spend: { created: 0 } }, shadowItCount: 0 });
    }

    const { access_token } = JSON.parse(integration.config) as { access_token: string };

    await db.integration.update({
      where: { id: integration.id },
      data:  { status: "syncing" },
    });

    const { apps, spend, shadowItCount } = await syncPlaidTransactions(access_token);
    const result = await runSync(orgId, { apps, spend });

    await db.integration.update({
      where: { id: integration.id },
      data: {
        status:    "connected",
        lastSyncAt: new Date(),
        syncCount: { increment: 1 },
        lastError: null,
      },
    });

    return NextResponse.json({ ok: true, result, shadowItCount });
  } catch (err) {
    console.error("[plaid/sync]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Sync failed" },
      { status: 500 }
    );
  }
}
