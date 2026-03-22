import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { getExternalId, getAwsAccountId } from "@/lib/integrations/aws";

/**
 * GET /api/integrations/aws/setup-info
 *
 * Returns the org-specific External ID and SaaS-Scrub's AWS account ID
 * for display in the setup wizard. External ID is HMAC-signed server-side
 * so it is never derived from user input.
 */
export async function GET() {
  try {
    const session    = await requireSession();
    const { orgId }  = session;

    const externalId  = getExternalId(orgId);
    const awsAccountId = getAwsAccountId();

    return NextResponse.json({ externalId, awsAccountId });
  } catch (err) {
    console.error("[aws/setup-info]", err);
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
