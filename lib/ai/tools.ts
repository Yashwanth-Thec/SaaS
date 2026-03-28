import type Anthropic from "@anthropic-ai/sdk";
import { db } from "@/lib/db";

// ─── Tool definitions (sent to Claude) ───────────────────────────────────────

export const ADVISOR_TOOLS: Anthropic.Tool[] = [
  {
    name: "get_saas_overview",
    description: "Returns a high-level summary of the organization's SaaS stack: total apps, monthly/annual spend, seat counts, active alert count, and pending offboardings.",
    input_schema: { type: "object" as const, properties: {}, required: [] },
  },
  {
    name: "get_apps",
    description: "Returns a list of SaaS apps. Can filter by category, status, or minimum monthly spend.",
    input_schema: {
      type: "object" as const,
      properties: {
        category: { type: "string", description: "Filter by category: communication, design, dev, productivity, hr, finance, security, analytics, other" },
        status:   { type: "string", description: "Filter by status: active, flagged, cancelled, under_review, zombie" },
        minSpend: { type: "number", description: "Minimum monthly spend in USD" },
        limit:    { type: "number", description: "Max results to return (default 20)" },
      },
      required: [],
    },
  },
  {
    name: "get_underutilized_apps",
    description: "Returns apps where seat utilization is below a given threshold. Useful for finding waste.",
    input_schema: {
      type: "object" as const,
      properties: {
        threshold: { type: "number", description: "Utilization % threshold, e.g. 50 means under 50% utilization (default 60)" },
      },
      required: [],
    },
  },
  {
    name: "get_spend_by_category",
    description: "Returns monthly spend broken down by SaaS category, sorted by spend descending.",
    input_schema: { type: "object" as const, properties: {}, required: [] },
  },
  {
    name: "get_contracts_expiring",
    description: "Returns contracts expiring within a given number of days, including auto-renewal flags and notice windows.",
    input_schema: {
      type: "object" as const,
      properties: {
        withinDays: { type: "number", description: "Number of days to look ahead (default 90)" },
      },
      required: [],
    },
  },
  {
    name: "get_active_alerts",
    description: "Returns unresolved alerts sorted by severity. Can filter by type.",
    input_schema: {
      type: "object" as const,
      properties: {
        type:     { type: "string", description: "Filter by alert type: zombie_app, renewal_upcoming, redundancy, budget_exceeded, shadow_it, unused_seats" },
        severity: { type: "string", description: "Filter by severity: critical, warning, info" },
      },
      required: [],
    },
  },
  {
    name: "get_offboarding_status",
    description: "Returns pending/in-progress offboarding records and a summary of which apps need to be revoked per employee.",
    input_schema: { type: "object" as const, properties: {}, required: [] },
  },
  {
    name: "create_alert",
    description: "Creates a new alert for the organization. Use this when the user asks to be notified about something or when you detect an issue that warrants an alert.",
    input_schema: {
      type: "object" as const,
      properties: {
        type:     { type: "string", description: "Alert type: zombie_app, renewal_upcoming, redundancy, budget_exceeded, shadow_it, unused_seats" },
        severity: { type: "string", description: "Severity: critical, warning, info" },
        title:    { type: "string", description: "Short alert title (max 80 chars)" },
        body:     { type: "string", description: "Detailed alert description" },
        appId:    { type: "string", description: "Optional: ID of the related app" },
      },
      required: ["type", "severity", "title", "body"],
    },
  },
];

// ─── Tool executors (run against DB) ─────────────────────────────────────────

export type ToolInput = Record<string, unknown>;

export async function executeTool(
  name:  string,
  input: ToolInput,
  orgId: string,
): Promise<unknown> {
  switch (name) {
    case "get_saas_overview": return getSaasOverview(orgId);
    case "get_apps":          return getApps(orgId, input);
    case "get_underutilized_apps": return getUnderutilizedApps(orgId, input);
    case "get_spend_by_category":  return getSpendByCategory(orgId);
    case "get_contracts_expiring": return getContractsExpiring(orgId, input);
    case "get_active_alerts":      return getActiveAlerts(orgId, input);
    case "get_offboarding_status": return getOffboardingStatus(orgId);
    case "create_alert":           return createAlert(orgId, input);
    default: return { error: `Unknown tool: ${name}` };
  }
}

// ─── Individual tool implementations ─────────────────────────────────────────

async function getSaasOverview(orgId: string) {
  const [apps, alerts, offboardings] = await Promise.all([
    db.saasApp.findMany({ where: { orgId }, select: { monthlySpend: true, totalSeats: true, activeSeats: true, status: true } }),
    db.alert.count({ where: { orgId, isDismissed: false } }),
    db.offboarding.count({ where: { orgId, status: { in: ["pending", "in_progress"] } } }),
  ]);

  const active = apps.filter((a) => a.status !== "cancelled");
  const totalMRR = active.reduce((s, a) => s + a.monthlySpend, 0);
  const totalSeats = active.reduce((s, a) => s + a.totalSeats, 0);
  const activeSeats = active.reduce((s, a) => s + a.activeSeats, 0);

  return {
    totalApps:         active.length,
    monthlySpend:      Math.round(totalMRR),
    annualSpend:       Math.round(totalMRR * 12),
    totalSeats,
    activeSeats,
    unusedSeats:       totalSeats - activeSeats,
    utilizationPct:    totalSeats > 0 ? Math.round((activeSeats / totalSeats) * 100) : 0,
    activeAlerts:      alerts,
    pendingOffboardings: offboardings,
  };
}

async function getApps(orgId: string, input: ToolInput) {
  const where: Record<string, unknown> = { orgId };
  if (input.category) where.category = input.category;
  if (input.status)   where.status   = input.status;
  if (input.minSpend) where.monthlySpend = { gte: input.minSpend };

  const apps = await db.saasApp.findMany({
    where,
    orderBy: { monthlySpend: "desc" },
    take: (input.limit as number) || 20,
    select: {
      id: true, name: true, category: true, status: true,
      monthlySpend: true, totalSeats: true, activeSeats: true, source: true,
    },
  });

  return apps.map((a) => ({
    ...a,
    utilizationPct: a.totalSeats > 0 ? Math.round((a.activeSeats / a.totalSeats) * 100) : 0,
    costPerSeat:    a.totalSeats > 0 ? Math.round(a.monthlySpend / a.totalSeats) : 0,
  }));
}

async function getUnderutilizedApps(orgId: string, input: ToolInput) {
  const threshold = (input.threshold as number) ?? 60;
  const apps = await db.saasApp.findMany({
    where: { orgId, status: "active", totalSeats: { gt: 0 } },
    select: { id: true, name: true, category: true, monthlySpend: true, totalSeats: true, activeSeats: true },
  });

  return apps
    .map((a) => ({ ...a, utilizationPct: Math.round((a.activeSeats / a.totalSeats) * 100) }))
    .filter((a) => a.utilizationPct < threshold)
    .sort((a, b) => b.monthlySpend - a.monthlySpend)
    .map((a) => ({
      ...a,
      wastedSpend: Math.round(((a.totalSeats - a.activeSeats) / a.totalSeats) * a.monthlySpend),
    }));
}

async function getSpendByCategory(orgId: string) {
  const apps = await db.saasApp.findMany({
    where: { orgId, status: { not: "cancelled" } },
    select: { category: true, monthlySpend: true },
  });

  const byCategory: Record<string, number> = {};
  for (const app of apps) {
    byCategory[app.category] = (byCategory[app.category] ?? 0) + app.monthlySpend;
  }

  return Object.entries(byCategory)
    .map(([category, monthlySpend]) => ({ category, monthlySpend: Math.round(monthlySpend), annualSpend: Math.round(monthlySpend * 12) }))
    .sort((a, b) => b.monthlySpend - a.monthlySpend);
}

async function getContractsExpiring(orgId: string, input: ToolInput) {
  const days = (input.withinDays as number) ?? 90;
  const cutoff = new Date(Date.now() + days * 24 * 60 * 60 * 1000);

  const contracts = await db.contract.findMany({
    where: { orgId, renewalDate: { lte: cutoff }, status: "active" },
    orderBy: { renewalDate: "asc" },
    include: { app: { select: { name: true, category: true, monthlySpend: true } } },
  });

  return contracts.map((c) => ({
    id:           c.id,
    vendor:       c.vendor,
    value:        c.value,
    renewalDate:  c.renewalDate.toISOString().split("T")[0],
    daysUntil:    Math.ceil((c.renewalDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)),
    autoRenews:   c.autoRenews,
    noticeDays:   c.noticeDays,
    inNoticeWindow: Math.ceil((c.renewalDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)) <= c.noticeDays,
    app:          c.app,
  }));
}

async function getActiveAlerts(orgId: string, input: ToolInput) {
  const where: Record<string, unknown> = { orgId, isDismissed: false };
  if (input.type)     where.type     = input.type;
  if (input.severity) where.severity = input.severity;

  return db.alert.findMany({
    where,
    orderBy: [{ severity: "asc" }, { createdAt: "desc" }],
    take: 20,
    select: { id: true, type: true, severity: true, title: true, body: true, createdAt: true },
  });
}

async function getOffboardingStatus(orgId: string) {
  const offboardings = await db.offboarding.findMany({
    where: { orgId, status: { in: ["pending", "in_progress"] } },
    include: {
      employee: { select: { name: true, email: true, department: true } },
    },
    take: 10,
  });

  return offboardings.map((o) => {
    const steps = JSON.parse(o.steps) as { title: string; status: string }[];
    const done  = steps.filter((s) => s.status === "done").length;
    return {
      id:       o.id,
      status:   o.status,
      employee: o.employee,
      progress: `${done}/${steps.length} steps`,
      createdAt: o.createdAt.toISOString().split("T")[0],
    };
  });
}

async function createAlert(orgId: string, input: ToolInput) {
  const alert = await db.alert.create({
    data: {
      orgId,
      type:     String(input.type),
      severity: String(input.severity),
      title:    String(input.title),
      body:     String(input.body),
      appId:    input.appId ? String(input.appId) : null,
    },
  });
  return { created: true, alertId: alert.id, title: alert.title };
}
