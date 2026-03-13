import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { createLinkToken, isPlaidConfigured } from "@/lib/integrations/plaid";

/**
 * POST /api/integrations/plaid/link
 * Creates a Plaid Link token for the frontend to open the bank-connect modal.
 */
export async function POST() {
  try {
    const session = await requireSession();

    if (!isPlaidConfigured()) {
      return NextResponse.json(
        { error: "Plaid credentials not configured. Set PLAID_CLIENT_ID and PLAID_SECRET in .env" },
        { status: 400 }
      );
    }

    const linkToken = await createLinkToken(session.userId);
    return NextResponse.json({ link_token: linkToken });
  } catch (err) {
    console.error("[plaid/link]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to create link token" },
      { status: 500 }
    );
  }
}
