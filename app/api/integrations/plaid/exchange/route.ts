import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireSession } from "@/lib/auth";
import { exchangePublicToken, syncPlaidTransactions } from "@/lib/integrations/plaid";
import { runSync } from "@/lib/integrations/sync-engine";
import { db } from "@/lib/db";

const schema = z.object({
  public_token:   z.string(),
  institution_name: z.string().optional(),
});

/**
 * POST /api/integrations/plaid/exchange
 * Exchanges the public_token from Plaid Link for a persistent access_token,
 * stores it, and kicks off the first transaction sync.
 */
export async function POST(req: NextRequest) {
  try {
    const session = await requireSession();
    const { orgId } = session;

    const body = await req.json();
    const { public_token, institution_name } = schema.parse(body);

    // Exchange tokens
    const { access_token, item_id } = await exchangePublicToken(public_token);

    // Store integration
    await db.integration.upsert({
      where:  { orgId_type: { orgId, type: "plaid" } },
      update: {
        status:    "syncing",
        config:    JSON.stringify({ access_token, item_id }),
        name:      institution_name ? `Bank Feed — ${institution_name}` : "Bank Feed",
        lastError: null,
      },
      create: {
        orgId,
        type:   "plaid",
        name:   institution_name ? `Bank Feed — ${institution_name}` : "Bank Feed",
        status: "syncing",
        config: JSON.stringify({ access_token, item_id }),
      },
    });

    // First sync
    const { apps, spend, shadowItCount } = await syncPlaidTransactions(access_token);
    const result = await runSync(orgId, { apps, spend });

    await db.integration.update({
      where: { orgId_type: { orgId, type: "plaid" } },
      data: {
        status:    "connected",
        lastSyncAt: new Date(),
        syncCount: { increment: 1 },
        lastError: null,
      },
    });

    return NextResponse.json({
      ok: true,
      result,
      shadowItCount,
    });
  } catch (err) {
    console.error("[plaid/exchange]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Exchange failed" },
      { status: 500 }
    );
  }
}
