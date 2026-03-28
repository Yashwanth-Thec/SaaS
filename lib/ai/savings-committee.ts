import { getAnthropicClient, MODELS } from "./claude";
import { db } from "@/lib/db";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AgentPerspective {
  agent:      "cfo" | "it_risk" | "vendor";
  label:      string;
  emoji:      string;
  findings:   string[];
  topAction:  string;
  savings?:   string;
}

export interface SavingsPlan {
  generatedAt:   string;
  totalSavings:  number;
  perspectives:  AgentPerspective[];
  synthesis:     string;
  priorityActions: string[];
  aiPowered:     boolean;
}

// ─── Snapshot ─────────────────────────────────────────────────────────────────

async function getOrgSnapshot(orgId: string) {
  const [apps, contracts, alerts] = await Promise.all([
    db.saasApp.findMany({
      where: { orgId, status: { not: "cancelled" } },
      select: { id: true, name: true, category: true, monthlySpend: true, totalSeats: true, activeSeats: true, status: true },
    }),
    db.contract.findMany({
      where: { orgId, status: "active" },
      select: { vendor: true, value: true, renewalDate: true, autoRenews: true, noticeDays: true },
      take: 20,
    }),
    db.alert.findMany({
      where: { orgId, isDismissed: false },
      select: { type: true, severity: true, title: true },
      take: 20,
    }),
  ]);

  const totalMRR = apps.reduce((s, a) => s + a.monthlySpend, 0);
  const summary = {
    totalApps: apps.length,
    totalMRR:  Math.round(totalMRR),
    totalARR:  Math.round(totalMRR * 12),
    apps: apps.map((a) => ({
      ...a,
      utilizationPct: a.totalSeats > 0 ? Math.round((a.activeSeats / a.totalSeats) * 100) : 0,
    })),
    contracts,
    alerts,
  };
  return summary;
}

// ─── Single-agent call ────────────────────────────────────────────────────────

async function runAgent(
  role:     string,
  system:   string,
  snapshot: ReturnType<typeof getOrgSnapshot> extends Promise<infer T> ? T : never,
): Promise<string> {
  const claude = getAnthropicClient();
  const msg = await claude.messages.create({
    model:      MODELS.sonnet,
    max_tokens: 2048,
    system,
    messages: [{
      role:    "user",
      content: `Here is the organization's SaaS data:\n${JSON.stringify(snapshot, null, 2)}\n\nProvide your analysis as JSON matching this shape exactly:\n{"findings": ["...", "..."], "topAction": "...", "savings": "$X,XXX/mo or null"}`,
    }],
  });

  const raw   = msg.content[0]?.type === "text" ? msg.content[0].text : "";
  return raw;
}

// ─── Parse agent JSON safely ──────────────────────────────────────────────────

function parseAgent(raw: string): { findings: string[]; topAction: string; savings?: string } {
  try {
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) return { findings: [], topAction: "Analysis unavailable" };
    return JSON.parse(match[0]);
  } catch {
    return { findings: [], topAction: raw.slice(0, 200) };
  }
}

// ─── Synthesis call ───────────────────────────────────────────────────────────

async function synthesize(perspectives: AgentPerspective[], totalMRR: number): Promise<{ synthesis: string; priorityActions: string[]; totalSavings: number }> {
  const claude = getAnthropicClient();

  const prompt = `Three expert agents reviewed an org with $${totalMRR}/mo SaaS spend:

CFO Agent: ${JSON.stringify(perspectives[0])}
IT Risk Agent: ${JSON.stringify(perspectives[1])}
Vendor Expert: ${JSON.stringify(perspectives[2])}

Return JSON:
{
  "synthesis": "2-3 sentence executive synthesis of the consensus recommendation",
  "priorityActions": ["Action 1 (most impactful)", "Action 2", "Action 3", "Action 4", "Action 5"],
  "totalSavings": <number: total estimated monthly savings in USD>
}`;

  const msg = await claude.messages.create({
    model:      MODELS.opus,
    max_tokens: 1024,
    messages: [{ role: "user", content: prompt }],
  });

  try {
    const raw   = msg.content[0]?.type === "text" ? msg.content[0].text : "{}";
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("no json");
    return JSON.parse(match[0]);
  } catch {
    return {
      synthesis:       "Analysis complete. Review individual agent findings for specific recommendations.",
      priorityActions: perspectives.map((p) => p.topAction).slice(0, 5),
      totalSavings:    0,
    };
  }
}

// ─── Main export ─────────────────────────────────────────────────────────────

export async function runSavingsCommittee(orgId: string): Promise<SavingsPlan> {
  const snapshot = await getOrgSnapshot(orgId);

  // Run all 3 agents in parallel
  const [cfoRaw, riskRaw, vendorRaw] = await Promise.all([
    runAgent("cfo", `You are a CFO advisor specializing in SaaS cost optimization.
Focus on: ROI, cost-per-seat, spend concentration risk, underutilized licenses, and budget leakage.
Be specific with dollar amounts. Identify the highest-leverage cost reduction opportunities.`, snapshot),

    runAgent("it_risk", `You are an IT Risk & Security advisor reviewing a SaaS portfolio.
Focus on: shadow IT, data sprawl, zombie apps with stale access, compliance gaps, and consolidation risks.
Flag apps that pose security or compliance risk if left unchecked.`, snapshot),

    runAgent("vendor", `You are a SaaS vendor negotiation expert.
Focus on: contracts up for renewal, auto-renewal traps, pricing leverage, bundling opportunities, and downgrade options.
Identify where the org has negotiating power right now.`, snapshot),
  ]);

  const cfo    = parseAgent(cfoRaw);
  const risk   = parseAgent(riskRaw);
  const vendor = parseAgent(vendorRaw);

  const perspectives: AgentPerspective[] = [
    { agent: "cfo",    label: "CFO Advisor",          emoji: "💰", ...cfo    },
    { agent: "it_risk", label: "IT Risk & Security",  emoji: "🛡️", ...risk  },
    { agent: "vendor", label: "Vendor Negotiator",    emoji: "🤝", ...vendor },
  ];

  const { synthesis, priorityActions, totalSavings } = await synthesize(perspectives, snapshot.totalMRR);

  return {
    generatedAt:     new Date().toISOString(),
    totalSavings,
    perspectives,
    synthesis,
    priorityActions,
    aiPowered:       true,
  };
}
