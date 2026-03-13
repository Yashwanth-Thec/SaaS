import { db }                           from "@/lib/db";
import { chatWithOpenRouter, hasOpenRouterKey } from "./openrouter";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AppSummary {
  id:             string;
  name:           string;
  category:       string;
  monthlySpend:   number;
  totalSeats:     number;
  activeSeats:    number;
  status:         string;
  utilizationPct: number;
  costPerSeat:    number;
}

export interface RedundancyGroup {
  category:              string;
  apps:                  AppSummary[];
  redundancyScore:       number;   // 0-100
  estimatedWaste:        number;   // $/mo (unused seats across all apps)
  consolidationSavings:  number;   // $/mo (eliminate apps' spend)
  keepApp:               AppSummary | null;
  eliminateApps:         AppSummary[];
  recommendation:        string;
  migrationSteps:        string[];
  aiInsight:             string | null;
  riskLevel:             "low" | "medium" | "high";
}

export interface RedundancyAnalysis {
  analyzedAt:            string;
  totalWaste:            number;
  totalPotentialSavings: number;
  redundantCategories:   number;
  groups:                RedundancyGroup[];
  summary:               string;
  aiPowered:             boolean;
}

// ─── Known competing tool pairs ───────────────────────────────────────────────

const OVERLAPS: Record<string, string[]> = {
  "slack":             ["microsoft teams", "google chat", "discord", "mattermost"],
  "microsoft teams":   ["slack", "google chat", "discord", "zoom"],
  "google chat":       ["slack", "microsoft teams", "discord"],
  "zoom":              ["google meet", "microsoft teams", "webex", "gotomeeting", "whereby"],
  "google meet":       ["zoom", "microsoft teams", "webex"],
  "webex":             ["zoom", "google meet", "microsoft teams"],
  "notion":            ["confluence", "sharepoint", "dropbox paper", "coda"],
  "confluence":        ["notion", "sharepoint", "dropbox paper", "coda"],
  "coda":              ["notion", "confluence", "airtable"],
  "jira":              ["asana", "monday.com", "linear", "trello", "clickup", "basecamp", "height"],
  "asana":             ["jira", "monday.com", "trello", "clickup", "linear"],
  "monday.com":        ["jira", "asana", "trello", "clickup", "linear"],
  "clickup":           ["jira", "asana", "monday.com", "notion", "trello", "linear"],
  "trello":            ["jira", "asana", "monday.com", "clickup"],
  "linear":            ["jira", "asana", "clickup", "github"],
  "height":            ["jira", "asana", "linear", "clickup"],
  "github":            ["gitlab", "bitbucket", "azure devops"],
  "gitlab":            ["github", "bitbucket", "azure devops"],
  "bitbucket":         ["github", "gitlab"],
  "azure devops":      ["github", "gitlab", "jira"],
  "figma":             ["sketch", "adobe xd", "invision", "zeplin", "framer"],
  "sketch":            ["figma", "adobe xd", "invision"],
  "adobe xd":          ["figma", "sketch", "invision"],
  "framer":            ["figma", "webflow"],
  "invision":          ["figma", "sketch", "zeplin"],
  "dropbox":           ["google drive", "box", "onedrive", "sharepoint"],
  "google drive":      ["dropbox", "box", "onedrive"],
  "box":               ["dropbox", "google drive", "onedrive"],
  "onedrive":          ["dropbox", "google drive", "box"],
  "salesforce":        ["hubspot", "pipedrive", "zoho crm"],
  "hubspot":           ["salesforce", "pipedrive", "zoho crm"],
  "pipedrive":         ["salesforce", "hubspot", "zoho crm"],
  "zendesk":           ["intercom", "freshdesk", "helpscout", "front"],
  "intercom":          ["zendesk", "freshdesk", "helpscout"],
  "freshdesk":         ["zendesk", "intercom", "helpscout"],
  "helpscout":         ["zendesk", "intercom", "freshdesk"],
  "datadog":           ["new relic", "dynatrace", "grafana", "splunk"],
  "new relic":         ["datadog", "dynatrace", "splunk"],
  "dynatrace":         ["datadog", "new relic", "splunk"],
  "grafana":           ["datadog", "new relic"],
  "tableau":           ["looker", "power bi", "metabase", "mode"],
  "looker":            ["tableau", "power bi", "metabase"],
  "power bi":          ["tableau", "looker", "metabase"],
  "metabase":          ["tableau", "looker", "power bi"],
  "google workspace":  ["microsoft 365", "office 365"],
  "microsoft 365":     ["google workspace", "office 365"],
  "office 365":        ["google workspace", "microsoft 365"],
  "docusign":          ["hellosign", "pandadoc", "adobe sign"],
  "hellosign":         ["docusign", "pandadoc"],
  "pandadoc":          ["docusign", "hellosign"],
  "twilio":            ["vonage", "bandwidth", "messagebird"],
  "mailchimp":         ["hubspot", "sendgrid", "klaviyo", "convertkit"],
  "sendgrid":          ["mailchimp", "postmark", "ses"],
};

// ─── Scoring ─────────────────────────────────────────────────────────────────

function getOverlapBonus(names: string[]): number {
  const lower = names.map((n) => n.toLowerCase());
  let bonus   = 0;
  for (let i = 0; i < lower.length; i++) {
    for (let j = i + 1; j < lower.length; j++) {
      const a = lower[i];
      const b = lower[j];
      // find any OVERLAPS key that is a substring of a or b
      for (const [key, competitors] of Object.entries(OVERLAPS)) {
        const aMatch = a.includes(key) || key.includes(a.split(" ")[0]);
        const bMatch = b.includes(key) || key.includes(b.split(" ")[0]);
        if (aMatch && competitors.some((c) => b.includes(c.split(" ")[0]) || c.includes(b.split(" ")[0]))) {
          bonus += 35;
        }
        if (bMatch && competitors.some((c) => a.includes(c.split(" ")[0]) || c.includes(a.split(" ")[0]))) {
          bonus += 35;
        }
      }
    }
  }
  return Math.min(bonus, 40);
}

function scoreRedundancy(apps: AppSummary[]): number {
  if (apps.length < 2) return 0;
  const base    = Math.min((apps.length - 1) * 25, 50);
  const overlap = getOverlapBonus(apps.map((a) => a.name));
  const utils   = apps.map((a) => a.utilizationPct / 100);
  const avg     = utils.reduce((s, u) => s + u, 0) / utils.length;
  const variance= utils.reduce((s, u) => s + Math.abs(u - avg), 0) / utils.length;
  const utilScore = Math.round((1 - variance) * 10);
  return Math.min(base + overlap + utilScore, 100);
}

// ─── Pick which app to keep ───────────────────────────────────────────────────

function pickKeepApp(apps: AppSummary[]): AppSummary {
  return apps.reduce((best, app) => {
    if (app.utilizationPct > best.utilizationPct) return app;
    if (app.utilizationPct === best.utilizationPct && app.costPerSeat < best.costPerSeat) return app;
    return best;
  });
}

// ─── Waste & savings estimates ────────────────────────────────────────────────

function estimateWaste(apps: AppSummary[]): number {
  return apps.reduce((total, app) => {
    const unused = Math.max(app.totalSeats - app.activeSeats, 0);
    const wasted = app.totalSeats > 0 ? (unused / app.totalSeats) * app.monthlySpend : 0;
    return total + wasted;
  }, 0);
}

function estimateSavings(eliminate: AppSummary[]): number {
  return eliminate.reduce((s, a) => s + a.monthlySpend, 0);
}

// ─── Text helpers ─────────────────────────────────────────────────────────────

function fmtMoney(n: number) {
  return n >= 1000 ? `$${(n / 1000).toFixed(1)}K` : `$${Math.round(n)}`;
}

function buildRecommendation(keep: AppSummary, eliminate: AppSummary[]): string {
  const savings = estimateSavings(eliminate);
  const names   = eliminate.map((a) => a.name).join(" and ");
  return `Consolidate to ${keep.name}. Retire ${names} to unlock ${fmtMoney(savings)}/mo in savings.`;
}

function buildMigrationSteps(keep: AppSummary, eliminate: AppSummary[]): string[] {
  const steps: string[] = [];
  const elimNames = eliminate.map((a) => a.name).join(" and ");
  steps.push(`Audit all teams actively using ${elimNames} — document workflows and dependencies`);
  steps.push(`Verify ${keep.name} covers required features; identify any gaps and plan workarounds`);
  steps.push(`Schedule a 30-day migration window and communicate timeline to all affected employees`);
  for (const app of eliminate) {
    steps.push(`Export all data and integrations from ${app.name} before cutover`);
  }
  steps.push(`Migrate users to ${keep.name} and run both systems in parallel for 2 weeks`);
  for (const app of eliminate) {
    steps.push(`Cancel ${app.name} subscription (save ${fmtMoney(app.monthlySpend)}/mo) and revoke all access`);
  }
  steps.push(`Decommission ${elimNames} and archive exported data per your retention policy`);
  return steps;
}

// ─── Heuristic analysis ───────────────────────────────────────────────────────

function analyzeApps(apps: AppSummary[]): RedundancyGroup[] {
  const byCategory = new Map<string, AppSummary[]>();
  for (const app of apps) {
    if (!byCategory.has(app.category)) byCategory.set(app.category, []);
    byCategory.get(app.category)!.push(app);
  }

  const groups: RedundancyGroup[] = [];
  for (const [category, catApps] of byCategory.entries()) {
    if (catApps.length < 2) continue;
    const score = scoreRedundancy(catApps);
    if (score < 15) continue;

    const keep     = pickKeepApp(catApps);
    const eliminate = catApps.filter((a) => a.id !== keep.id);
    const waste    = estimateWaste(catApps);
    const savings  = estimateSavings(eliminate);

    groups.push({
      category,
      apps:                 catApps,
      redundancyScore:      score,
      estimatedWaste:       Math.round(waste),
      consolidationSavings: Math.round(savings),
      keepApp:              keep,
      eliminateApps:        eliminate,
      recommendation:       buildRecommendation(keep, eliminate),
      migrationSteps:       buildMigrationSteps(keep, eliminate),
      aiInsight:            null,
      riskLevel:            score >= 70 ? "high" : score >= 40 ? "medium" : "low",
    });
  }

  return groups.sort((a, b) => b.consolidationSavings - a.consolidationSavings);
}

// ─── LLM enrichment ──────────────────────────────────────────────────────────

interface LLMResult {
  summary: string;
  groups: { category: string; insight: string; migrationSteps: string[] }[];
}

async function enrichWithLLM(
  groups: RedundancyGroup[],
  orgName: string,
): Promise<{ groups: RedundancyGroup[]; summary: string | null }> {
  if (!hasOpenRouterKey() || groups.length === 0) {
    return { groups, summary: null };
  }

  const payload = groups.map((g) => ({
    category:         g.category,
    redundancyScore:  g.redundancyScore,
    keepApp:          g.keepApp?.name,
    eliminateApps:    g.eliminateApps.map((a) => a.name),
    potentialSavings: `${fmtMoney(g.consolidationSavings)}/mo`,
    apps: g.apps.map((a) => ({
      name:        a.name,
      monthlySpend: `${fmtMoney(a.monthlySpend)}/mo`,
      utilization: `${a.utilizationPct}%`,
      seats:       `${a.activeSeats}/${a.totalSeats} active`,
    })),
  }));

  const prompt = `You are a SaaS cost optimization expert advising ${orgName}.

Redundant tool groups detected:
${JSON.stringify(payload, null, 2)}

Return ONLY valid JSON (no markdown fences, no explanation):
{
  "summary": "1-2 sentence executive summary of total waste and highest-impact action",
  "groups": [
    {
      "category": "<exact category string from input>",
      "insight": "2-3 sentences: why this redundancy likely grew, who owns each tool, and the biggest risk of inaction",
      "migrationSteps": ["<specific step 1>", "<specific step 2>", "<specific step 3>", "<specific step 4>"]
    }
  ]
}`;

  try {
    const raw   = await chatWithOpenRouter({ messages: [{ role: "user", content: prompt }] });
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) return { groups, summary: null };

    const parsed: LLMResult = JSON.parse(match[0]);

    const enriched = groups.map((group) => {
      const llm = parsed.groups?.find((g) => g.category === group.category);
      return {
        ...group,
        aiInsight:     llm?.insight      ?? null,
        migrationSteps: llm?.migrationSteps?.length ? llm.migrationSteps : group.migrationSteps,
      };
    });

    return { groups: enriched, summary: parsed.summary ?? null };
  } catch {
    return { groups, summary: null };
  }
}

// ─── Cache ────────────────────────────────────────────────────────────────────

const cache = new Map<string, { result: RedundancyAnalysis; expiresAt: number }>();

// ─── Main export ─────────────────────────────────────────────────────────────

export async function runRedundancyAnalysis(
  orgId:   string,
  orgName: string,
  force = false,
): Promise<RedundancyAnalysis> {
  if (!force) {
    const cached = cache.get(orgId);
    if (cached && cached.expiresAt > Date.now()) return cached.result;
  }

  const raw = await db.saasApp.findMany({
    where:  { orgId, status: { not: "cancelled" } },
    select: { id: true, name: true, category: true, monthlySpend: true, totalSeats: true, activeSeats: true, status: true },
  });

  const apps: AppSummary[] = raw.map((a) => ({
    id:             a.id,
    name:           a.name,
    category:       a.category,
    monthlySpend:   a.monthlySpend,
    totalSeats:     a.totalSeats,
    activeSeats:    a.activeSeats,
    status:         a.status,
    utilizationPct: a.totalSeats > 0 ? Math.round((a.activeSeats / a.totalSeats) * 100) : 0,
    costPerSeat:    a.totalSeats > 0 ? Math.round(a.monthlySpend / a.totalSeats) : Math.round(a.monthlySpend),
  }));

  const heuristicGroups              = analyzeApps(apps);
  const { groups, summary: llmSummary } = await enrichWithLLM(heuristicGroups, orgName);

  const totalWaste   = groups.reduce((s, g) => s + g.estimatedWaste,        0);
  const totalSavings = groups.reduce((s, g) => s + g.consolidationSavings,  0);

  const defaultSummary =
    groups.length === 0
      ? "No significant tool redundancies detected in your current SaaS stack."
      : `Found ${groups.length} redundant tool ${groups.length === 1 ? "group" : "groups"} with ${fmtMoney(totalSavings)}/mo in consolidation savings.`;

  const result: RedundancyAnalysis = {
    analyzedAt:            new Date().toISOString(),
    totalWaste:            Math.round(totalWaste),
    totalPotentialSavings: Math.round(totalSavings),
    redundantCategories:   groups.length,
    groups,
    summary:               llmSummary ?? defaultSummary,
    aiPowered:             Boolean(llmSummary),
  };

  cache.set(orgId, { result, expiresAt: Date.now() + 60 * 60 * 1000 });
  return result;
}

export function clearAnalysisCache(orgId: string) {
  cache.delete(orgId);
}
