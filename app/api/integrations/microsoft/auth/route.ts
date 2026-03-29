import { type NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { buildMicrosoftDataAuthUrl, isMicrosoftConfigured } from "@/lib/integrations/microsoft";
import { db } from "@/lib/db";

/**
 * GET /api/integrations/microsoft/auth
 * Starts the Microsoft Entra ID data integration OAuth flow.
 * Redirects the admin to Microsoft's consent screen (admin consent required).
 */
export async function GET(request: NextRequest) {
  try {
    const session = await requireSession();

    if (!isMicrosoftConfigured()) {
      return NextResponse.redirect(
        new URL("/integrations?error=microsoft_not_configured", request.url)
      );
    }

    await db.integration.upsert({
      where:  { orgId_type: { orgId: session.orgId, type: "azure_ad" } },
      update: { status: "pending", lastError: null },
      create: {
        orgId:  session.orgId,
        type:   "azure_ad",
        name:   "Microsoft Entra ID",
        status: "pending",
      },
    });

    const url = buildMicrosoftDataAuthUrl(session.orgId);
    return NextResponse.redirect(url);
  } catch (err) {
    console.error("[microsoft/auth]", err);
    return NextResponse.redirect(
      new URL("/integrations?error=auth_failed", request.url)
    );
  }
}
