import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";

// GET — return current Slack webhook URL
export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  }

  const integration = await db.integration.findFirst({
    where: { orgId: session.orgId, type: "slack" },
  });

  if (!integration?.config) {
    return NextResponse.json({ webhookUrl: null });
  }

  try {
    const config = JSON.parse(integration.config);
    return NextResponse.json({ webhookUrl: config.webhookUrl ?? null });
  } catch {
    return NextResponse.json({ webhookUrl: null });
  }
}

// POST — save webhook URL
export async function POST(req: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  }

  let body: { webhookUrl?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { webhookUrl } = body;
  if (!webhookUrl || typeof webhookUrl !== "string" || !webhookUrl.trim()) {
    return NextResponse.json({ error: "webhookUrl is required" }, { status: 400 });
  }

  await db.integration.upsert({
    where: { orgId_type: { orgId: session.orgId, type: "slack" } },
    update: {
      config:    JSON.stringify({ webhookUrl: webhookUrl.trim() }),
      status:    "connected",
      updatedAt: new Date(),
    },
    create: {
      orgId:  session.orgId,
      type:   "slack",
      name:   "Slack",
      status: "connected",
      config: JSON.stringify({ webhookUrl: webhookUrl.trim() }),
    },
  });

  return NextResponse.json({ success: true });
}
