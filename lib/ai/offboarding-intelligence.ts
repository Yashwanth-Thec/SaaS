import { getAnthropicClient, MODELS } from "./claude";
import { db } from "@/lib/db";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SmartStep {
  id:       string;
  title:    string;
  details:  string;
  appName?: string;
  appId?:   string;
  priority: "critical" | "high" | "medium" | "low";
  status:   "pending";
}

// ─── Main export ─────────────────────────────────────────────────────────────

export async function generateOffboardingPlan(
  employeeId: string,
  orgId:      string,
  notes?:     string,
): Promise<SmartStep[]> {
  const employee = await db.employee.findUnique({
    where:   { id: employeeId },
    include: {
      appAccess: {
        where: { isActive: true },
        include: { app: { select: { id: true, name: true, category: true, monthlySpend: true } } },
      },
    },
  });

  if (!employee) throw new Error("Employee not found");

  const apps = employee.appAccess.map((a) => ({
    id:       a.appId,
    name:     a.app.name,
    category: a.app.category,
    role:     a.role,
    monthlyCost: a.app.monthlySpend,
  }));

  const claude = getAnthropicClient();
  const msg = await claude.messages.create({
    model:      MODELS.sonnet,
    max_tokens: 4096,
    system: `You are an IT offboarding specialist. Generate a detailed, app-specific offboarding checklist.
For each app, provide concrete steps that account for:
- Data ownership transfer (especially for owner/admin roles)
- Active sessions and API tokens that need revocation
- Shared resources or integrations that may break
- Licensing cost recovery after deprovisioning
Be specific — mention actual app features (e.g., "Transfer Notion workspaces", "Revoke Figma team admin").
Return ONLY valid JSON, no markdown fences.`,
    messages: [{
      role:    "user",
      content: `Employee: ${employee.name} (${employee.jobTitle ?? "unknown role"}, ${employee.department ?? "unknown dept"})
Email: ${employee.email}
Apps with active access: ${JSON.stringify(apps, null, 2)}
${notes ? `Manager notes: ${notes}` : ""}

Generate a prioritized offboarding checklist. Return JSON:
{
  "steps": [
    {
      "title": "<concise action title>",
      "details": "<specific instructions, 1-3 sentences>",
      "appName": "<app name or null for general steps>",
      "appId": "<app id or null>",
      "priority": "critical|high|medium|low"
    }
  ]
}

Rules:
- critical: active admin/owner roles, data at risk, or compliance-sensitive apps
- high: standard user access revocation, especially for security/finance apps
- medium: productivity/comms tools
- low: read-only access, minor tools
- Always include a final step to confirm all access is revoked and document in HR system
- Max 20 steps`,
    }],
  });

  const raw = msg.content[0]?.type === "text" ? msg.content[0].text : "{}";

  try {
    const match  = raw.match(/\{[\s\S]*\}/);
    const parsed = match ? JSON.parse(match[0]) : { steps: [] };
    return (parsed.steps ?? []).map((s: Omit<SmartStep, "id" | "status">, i: number) => ({
      ...s,
      id:     `step_${i + 1}`,
      status: "pending" as const,
    }));
  } catch {
    // Fallback to generic steps
    return apps.map((app, i) => ({
      id:       `step_${i + 1}`,
      title:    `Revoke access: ${app.name}`,
      details:  `Remove ${employee.name}'s ${app.role ?? "user"} access from ${app.name} and verify account deactivation.`,
      appName:  app.name,
      appId:    app.id,
      priority: (["security", "finance"].includes(app.category) ? "critical" : "high") as SmartStep["priority"],
      status:   "pending" as const,
    }));
  }
}
