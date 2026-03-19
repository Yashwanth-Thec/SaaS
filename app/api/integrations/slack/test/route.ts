import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";

export async function POST() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  }

  const integration = await db.integration.findFirst({
    where: { orgId: session.orgId, type: "slack" },
  });

  if (!integration?.config) {
    return NextResponse.json({ error: "No Slack webhook configured" }, { status: 400 });
  }

  let webhookUrl: string | null = null;
  try {
    const config = JSON.parse(integration.config);
    webhookUrl = config.webhookUrl ?? null;
  } catch {
    return NextResponse.json({ error: "No Slack webhook configured" }, { status: 400 });
  }

  if (!webhookUrl) {
    return NextResponse.json({ error: "No Slack webhook configured" }, { status: 400 });
  }

  const payload = {
    text: "✅ *SaaS-Scrub* test notification\n\n🚨 *Salesforce* renews in 23 days — auto-renew is ON. Contract value: $148,800.\n\nThis is a test message from SaaS-Scrub.",
    username: "SaaS-Scrub",
    icon_emoji: ":shield:",
  };

  try {
    const res = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      return NextResponse.json({ error: "Failed to reach Slack webhook" }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: "Test message sent to Slack!" });
  } catch {
    return NextResponse.json({ error: "Failed to reach Slack webhook" }, { status: 500 });
  }
}
