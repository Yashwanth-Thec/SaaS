import { NextRequest, NextResponse } from "next/server";
import {
  exchangeMicrosoftDataCode,
  buildStoredTokens,
  syncMicrosoftEntraID,
} from "@/lib/integrations/microsoft";
import { runSync } from "@/lib/integrations/sync-engine";
import { db } from "@/lib/db";

/**
 * GET /api/integrations/microsoft/callback
 * OAuth callback for Entra ID data integration.
 * Exchanges code for tokens, stores them, then kicks off the first sync.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const code   = searchParams.get("code");
  const state  = searchParams.get("state"); // orgId
  const msError = searchParams.get("error");

  const base = new URL(req.url).origin;

  if (msError || !code || !state) {
    return NextResponse.redirect(
      new URL(`/integrations?error=${msError ?? "missing_code"}`, base)
    );
  }

  const orgId = state;

  try {
    // 1. Exchange code for tokens
    const tokens = await exchangeMicrosoftDataCode(code);
    const stored = buildStoredTokens(tokens);

    // 2. Persist tokens
    await db.integration.update({
      where: { orgId_type: { orgId, type: "azure_ad" } },
      data: {
        status:    "syncing",
        config:    JSON.stringify(stored),
        lastError: null,
      },
    });

    // 3. Run first sync
    const discovered = await syncMicrosoftEntraID(orgId);
    const result     = await runSync(orgId, discovered);

    // 4. Mark connected
    await db.integration.update({
      where: { orgId_type: { orgId, type: "azure_ad" } },
      data: {
        status:     "connected",
        lastSyncAt: new Date(),
        syncCount:  { increment: 1 },
        lastError:  null,
      },
    });

    const params = new URLSearchParams({
      success:   "microsoft_connected",
      employees: String(result.employees.upserted),
      apps:      String(result.apps.upserted + result.apps.discovered),
    });
    return NextResponse.redirect(new URL(`/integrations?${params}`, base));
  } catch (err) {
    console.error("[microsoft/callback]", err);
    await db.integration
      .update({
        where: { orgId_type: { orgId, type: "azure_ad" } },
        data: {
          status:    "error",
          lastError: err instanceof Error ? err.message : "Unknown error",
        },
      })
      .catch(() => {});

    return NextResponse.redirect(
      new URL("/integrations?error=microsoft_sync_failed", base)
    );
  }
}
