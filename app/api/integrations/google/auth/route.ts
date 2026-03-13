import { type NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { buildGoogleAuthUrl, isGoogleConfigured } from "@/lib/integrations/google";
import { db } from "@/lib/db";

/**
 * GET /api/integrations/google/auth
 * Starts the Google Workspace OAuth2 flow.
 * Redirects the user to Google's consent screen.
 */
export async function GET(request: NextRequest) {
  try {
    const session = await requireSession();

    if (!isGoogleConfigured()) {
      // Redirect back to integrations with a clear error — never show raw JSON
      return NextResponse.redirect(
        new URL("/integrations?error=google_not_configured", request.url)
      );
    }

    // Create or reset the integration record
    await db.integration.upsert({
      where:  { orgId_type: { orgId: session.orgId, type: "google_workspace" } },
      update: { status: "pending", lastError: null },
      create: {
        orgId:  session.orgId,
        type:   "google_workspace",
        name:   "Google Workspace",
        status: "pending",
      },
    });

    const url = buildGoogleAuthUrl(session.orgId);
    return NextResponse.redirect(url);
  } catch (err) {
    console.error("[google/auth]", err);
    return NextResponse.redirect(
      new URL("/integrations?error=auth_failed", request.url)
    );
  }
}
