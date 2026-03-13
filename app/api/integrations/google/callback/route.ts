import { NextRequest, NextResponse } from "next/server";
import { exchangeGoogleCode, syncGoogleWorkspace } from "@/lib/integrations/google";
import { runSync } from "@/lib/integrations/sync-engine";
import { db } from "@/lib/db";

/**
 * GET /api/integrations/google/callback
 * OAuth2 callback — exchanges code for tokens, kicks off first sync.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const code  = searchParams.get("code");
  const state = searchParams.get("state"); // orgId
  const error = searchParams.get("error");

  // Use the incoming request URL as the base so redirects work on any port
  const base = new URL(req.url).origin;

  if (error || !code || !state) {
    return NextResponse.redirect(
      new URL(`/integrations?error=${error ?? "missing_code"}`, base)
    );
  }

  const orgId = state;

  try {
    // 1. Exchange code for tokens
    const tokens = await exchangeGoogleCode(code);

    // 2. Store tokens in integration config
    await db.integration.update({
      where: { orgId_type: { orgId, type: "google_workspace" } },
      data: {
        status:    "syncing",
        config:    JSON.stringify(tokens),
        lastError: null,
      },
    });

    // 3. Run first sync
    const discovered = await syncGoogleWorkspace(orgId);
    const result     = await runSync(orgId, discovered);

    // 4. Mark connected
    await db.integration.update({
      where: { orgId_type: { orgId, type: "google_workspace" } },
      data: {
        status:     "connected",
        lastSyncAt: new Date(),
        syncCount:  { increment: 1 },
        lastError:  null,
      },
    });

    const params = new URLSearchParams({
      success:   "google_connected",
      employees: String(result.employees.upserted),
      apps:      String(result.apps.upserted + result.apps.discovered),
    });
    return NextResponse.redirect(new URL(`/integrations?${params}`, base));
  } catch (err) {
    console.error("[google/callback]", err);
    await db.integration.update({
      where: { orgId_type: { orgId, type: "google_workspace" } },
      data: {
        status:    "error",
        lastError: err instanceof Error ? err.message : "Unknown error",
      },
    }).catch(() => {});

    return NextResponse.redirect(
      new URL("/integrations?error=sync_failed", base)
    );
  }
}
