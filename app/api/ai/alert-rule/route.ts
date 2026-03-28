import { NextRequest, NextResponse } from "next/server";
import { requireSession }   from "@/lib/auth";
import { getAnthropicClient, MODELS } from "@/lib/ai/claude";
import { db }               from "@/lib/db";

export async function POST(req: NextRequest) {
  let session;
  try { session = await requireSession(); }
  catch { return NextResponse.json({ error: "Unauthorized" }, { status: 401 }); }

  const { rule } = await req.json() as { rule: string };
  if (!rule?.trim()) return NextResponse.json({ error: "rule is required" }, { status: 400 });

  // Get current app data to evaluate the rule against
  const apps = await db.saasApp.findMany({
    where: { orgId: session.orgId, status: { not: "cancelled" } },
    select: { id: true, name: true, category: true, monthlySpend: true, totalSeats: true, activeSeats: true, status: true },
  });

  const appsWithUtil = apps.map((a) => ({
    ...a,
    utilizationPct: a.totalSeats > 0 ? Math.round((a.activeSeats / a.totalSeats) * 100) : 0,
    wastedSpend: a.totalSeats > 0
      ? Math.round(((a.totalSeats - a.activeSeats) / a.totalSeats) * a.monthlySpend)
      : 0,
  }));

  const claude  = getAnthropicClient();
  const message = await claude.messages.create({
    model:      MODELS.haiku,
    max_tokens: 1024,
    system: `You are an alert rule interpreter for a SaaS management platform.
Given a natural language rule from the user, evaluate it against current app data and return alerts to create.
Return ONLY valid JSON, no markdown.`,
    messages: [{
      role:    "user",
      content: `User rule: "${rule}"

Current app data:
${JSON.stringify(appsWithUtil, null, 2)}

Evaluate which apps match the rule. Return:
{
  "interpretation": "One sentence explaining how you interpreted the rule",
  "alerts": [
    {
      "appId": "<app id or null>",
      "type": "unused_seats|zombie_app|budget_exceeded|redundancy|shadow_it|renewal_upcoming",
      "severity": "critical|warning|info",
      "title": "<short title>",
      "body": "<detailed description including specific numbers>"
    }
  ]
}

If no apps match, return empty alerts array. Max 10 alerts.`,
    }],
  });

  const raw   = message.content[0]?.type === "text" ? message.content[0].text : "{}";
  let parsed: { interpretation: string; alerts: { appId?: string; type: string; severity: string; title: string; body: string }[] };

  try {
    const match = raw.match(/\{[\s\S]*\}/);
    parsed = match ? JSON.parse(match[0]) : { interpretation: "Could not parse rule", alerts: [] };
  } catch {
    return NextResponse.json({ error: "Failed to parse AI response" }, { status: 500 });
  }

  // Create the alerts in DB
  const created = await Promise.all(
    parsed.alerts.map((a) =>
      db.alert.create({
        data: {
          orgId:    session.orgId,
          type:     a.type,
          severity: a.severity,
          title:    a.title,
          body:     a.body,
          appId:    a.appId ?? null,
        },
      })
    )
  );

  return NextResponse.json({
    interpretation: parsed.interpretation,
    alertsCreated:  created.length,
    alerts:         created,
  });
}
