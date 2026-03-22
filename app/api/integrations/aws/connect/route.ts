import { NextRequest, NextResponse } from "next/server";
import { connectAws, syncAws, getExternalId, isAwsConfigured } from "@/lib/integrations/aws";
import { runSync } from "@/lib/integrations/sync-engine";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/auth";

/**
 * POST /api/integrations/aws/connect
 *
 * Body: { roleArn: string }
 *
 * 1. Validates the ARN format
 * 2. Attempts STS AssumeRole to verify trust is set up correctly
 * 3. Stores config and runs first sync
 */
export async function POST(req: NextRequest) {
  const session    = await requireSession();
  const { orgId }  = session;

  if (!isAwsConfigured()) {
    return NextResponse.json(
      { error: "AWS credentials not configured on server. Set AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY." },
      { status: 503 }
    );
  }

  let body: { roleArn?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const roleArn = body.roleArn;
  if (typeof roleArn !== "string" || !roleArn.trim()) {
    return NextResponse.json({ error: "roleArn is required" }, { status: 400 });
  }

  const externalId = getExternalId(orgId);

  // Mark as pending before attempting
  await db.integration.upsert({
    where:  { orgId_type: { orgId, type: "aws" } },
    update: { status: "pending", lastError: null },
    create: {
      orgId,
      type:   "aws",
      name:   "Amazon Web Services",
      status: "pending",
    },
  });

  try {
    // Validate ARN + assume role (throws if trust policy is wrong)
    await connectAws(orgId, roleArn.trim(), externalId);

    // Run first sync
    await db.integration.update({
      where: { orgId_type: { orgId, type: "aws" } },
      data:  { status: "syncing" },
    });

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

    return NextResponse.json({
      success: true,
      result,
      services: result.apps.upserted + result.apps.discovered,
      spend:    result.spend.created,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";

    await db.integration.update({
      where: { orgId_type: { orgId, type: "aws" } },
      data:  { status: "error", lastError: message },
    }).catch(() => {});

    // Give the user an actionable error message
    const userMessage = message.includes("AccessDenied") || message.includes("not authorized")
      ? "Role assumption failed. Check that the trust policy includes SaaS-Scrub's account ID and your External ID."
      : message.includes("NoSuchEntity") || message.includes("InvalidInput")
      ? "Role not found. Verify the Role ARN is correct."
      : message.includes("Invalid Role ARN")
      ? message
      : "Connection failed. Verify the Role ARN and trust policy, then try again.";

    return NextResponse.json({ error: userMessage }, { status: 400 });
  }
}
