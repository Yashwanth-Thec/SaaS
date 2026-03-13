"use client";
import { useState } from "react";
import {
  Brain, RefreshCw, Sparkles, TrendingDown, DollarSign,
  Layers, ChevronDown, ChevronUp, CheckCircle2, AlertTriangle,
  XCircle, ArrowRight, Package, Zap, MessageSquare, Palette,
  Code2, Users, BarChart3, Shield, Key,
} from "lucide-react";
import { Button }                 from "@/components/ui/Button";
import { Badge }                  from "@/components/ui/Badge";
import { Card, CardBody }         from "@/components/ui/Card";
import { formatCurrency, CATEGORY_COLORS, type AppCategory } from "@/lib/utils";
import type { RedundancyAnalysis, RedundancyGroup, AppSummary } from "@/lib/ai/redundancy";

// ─── Category helpers ─────────────────────────────────────────────────────────

const CATEGORY_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  communication: MessageSquare,
  design:        Palette,
  dev:           Code2,
  productivity:  Layers,
  hr:            Users,
  finance:       DollarSign,
  security:      Shield,
  analytics:     BarChart3,
  other:         Package,
};

function categoryLabel(cat: string) {
  const labels: Record<string, string> = {
    communication: "Communication",
    design:        "Design",
    dev:           "Development",
    productivity:  "Productivity",
    hr:            "HR & People",
    finance:       "Finance",
    security:      "Security",
    analytics:     "Analytics",
    other:         "Other",
  };
  return labels[cat] ?? cat.charAt(0).toUpperCase() + cat.slice(1);
}

// ─── Score gauge SVG ─────────────────────────────────────────────────────────

function ScoreGauge({ score }: { score: number }) {
  const r      = 28;
  const circ   = 2 * Math.PI * r;
  const fill   = (score / 100) * circ;
  const color  = score >= 70 ? "#ff4757" : score >= 40 ? "#ffb142" : "#00d97e";
  const label  = score >= 70 ? "High" : score >= 40 ? "Medium" : "Low";

  return (
    <div className="flex flex-col items-center gap-1 flex-shrink-0">
      <div className="relative">
        <svg width="72" height="72" viewBox="0 0 72 72" style={{ transform: "rotate(-90deg)" }}>
          <circle cx="36" cy="36" r={r} fill="none" stroke="#1a2030" strokeWidth="6" />
          <circle
            cx="36" cy="36" r={r}
            fill="none"
            stroke={color}
            strokeWidth="6"
            strokeDasharray={`${fill} ${circ - fill}`}
            strokeLinecap="round"
            style={{ transition: "stroke-dasharray 1s ease" }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span style={{ color, fontFamily: "var(--font-mono)", fontSize: "15px", fontWeight: "bold" }}>
            {score}
          </span>
        </div>
      </div>
      <span className="text-2xs font-semibold uppercase tracking-wider" style={{ color }}>
        {label}
      </span>
    </div>
  );
}

// ─── Utilization bar ──────────────────────────────────────────────────────────

function UtilBar({ pct }: { pct: number }) {
  const color = pct < 30 ? "#ff4757" : pct < 60 ? "#ffb142" : "#00d97e";
  return (
    <div className="h-1.5 rounded-full bg-border overflow-hidden w-16">
      <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
    </div>
  );
}

// ─── App row inside a group card ─────────────────────────────────────────────

function AppRow({ app, isKeep }: { app: AppSummary; isKeep: boolean }) {
  const catColor = CATEGORY_COLORS[app.category as AppCategory] ?? "#8892a0";
  return (
    <div className={`flex items-center gap-3 p-2.5 rounded-lg border transition-all ${
      isKeep ? "border-accent/30 bg-accent/5" : "border-border bg-surface"
    }`}>
      {/* App initial */}
      <div
        className="w-7 h-7 rounded-md flex items-center justify-center text-xs font-bold flex-shrink-0"
        style={{ background: `${catColor}18`, color: catColor }}
      >
        {app.name.charAt(0).toUpperCase()}
      </div>

      {/* Name + keep/eliminate */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-primary truncate">{app.name}</span>
          {isKeep
            ? <span className="text-2xs px-1.5 py-0.5 rounded bg-accent/15 text-accent border border-accent/20 font-semibold">KEEP</span>
            : <span className="text-2xs px-1.5 py-0.5 rounded bg-danger/10 text-danger border border-danger/20 font-semibold">RETIRE</span>
          }
        </div>
        <div className="flex items-center gap-2 mt-1">
          <UtilBar pct={app.utilizationPct} />
          <span className="text-2xs text-muted font-mono">{app.utilizationPct}% util</span>
          <span className="text-2xs text-muted">{app.activeSeats}/{app.totalSeats} seats</span>
        </div>
      </div>

      {/* Spend */}
      <div className="text-right flex-shrink-0">
        <div className={`text-xs font-mono font-bold ${isKeep ? "text-accent" : "text-secondary"}`}>
          {formatCurrency(app.monthlySpend)}/mo
        </div>
        {app.totalSeats > 0 && (
          <div className="text-2xs text-muted">{formatCurrency(app.costPerSeat)}/seat</div>
        )}
      </div>
    </div>
  );
}

// ─── Redundancy group card ────────────────────────────────────────────────────

function GroupCard({ group }: { group: RedundancyGroup }) {
  const [expanded, setExpanded] = useState(false);
  const CatIcon = CATEGORY_ICONS[group.category] ?? Package;
  const catColor = CATEGORY_COLORS[group.category as AppCategory] ?? "#8892a0";

  const riskBadge =
    group.riskLevel === "high"   ? <Badge variant="danger">High Risk</Badge>  :
    group.riskLevel === "medium" ? <Badge variant="warning">Medium Risk</Badge> :
                                   <Badge variant="neutral">Low Risk</Badge>;

  return (
    <Card elevated className="overflow-hidden">
      {/* Header */}
      <div className="p-5">
        <div className="flex items-start gap-4">
          {/* Score gauge */}
          <ScoreGauge score={group.redundancyScore} />

          {/* Category + apps */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-2">
              <div
                className="w-5 h-5 rounded flex items-center justify-center flex-shrink-0"
                style={{ background: `${catColor}20`, color: catColor }}
              >
                <CatIcon className="w-3 h-3" />
              </div>
              <span className="font-display font-bold text-sm text-primary">
                {categoryLabel(group.category)}
              </span>
              <span className="text-xs text-muted">
                {group.apps.length} tools · {group.apps.length - 1} redundant
              </span>
              {riskBadge}
            </div>

            {/* Recommendation */}
            <p className="text-xs text-secondary leading-relaxed">{group.recommendation}</p>

            {/* Savings callout */}
            <div className="flex flex-wrap items-stretch gap-2 mt-3">
              <div className="flex flex-col justify-between rounded-lg px-3 py-2 border" style={{ background: "rgba(0,217,126,0.08)", borderColor: "rgba(0,217,126,0.25)" }}>
                <span className="text-2xs uppercase tracking-wider font-semibold" style={{ color: "rgba(0,217,126,0.6)" }}>Monthly Savings</span>
                <span className="font-mono font-bold text-lg leading-tight" style={{ color: "#00d97e" }}>
                  {formatCurrency(group.consolidationSavings)}<span className="text-xs font-normal opacity-70">/mo</span>
                </span>
              </div>
              <div className="flex flex-col justify-between rounded-lg px-3 py-2 border" style={{ background: "rgba(0,217,126,0.05)", borderColor: "rgba(0,217,126,0.18)" }}>
                <span className="text-2xs uppercase tracking-wider font-semibold" style={{ color: "rgba(0,217,126,0.5)" }}>Annual Impact</span>
                <span className="font-mono font-bold text-lg leading-tight" style={{ color: "#00d97e" }}>
                  {formatCurrency(group.consolidationSavings * 12)}
                </span>
              </div>
              <div className="flex flex-col justify-between rounded-lg px-3 py-2 border" style={{ background: "rgba(255,177,66,0.07)", borderColor: "rgba(255,177,66,0.22)" }}>
                <span className="text-2xs uppercase tracking-wider font-semibold" style={{ color: "rgba(255,177,66,0.6)" }}>Seat Waste</span>
                <span className="font-mono font-bold text-lg leading-tight" style={{ color: "#ffb142" }}>
                  {formatCurrency(group.estimatedWaste)}<span className="text-xs font-normal opacity-70">/mo</span>
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* AI Insight */}
        {group.aiInsight && (
          <div className="mt-4 p-3 rounded-lg bg-accent/5 border border-accent/15 flex items-start gap-2">
            <Sparkles className="w-3.5 h-3.5 text-accent flex-shrink-0 mt-0.5" />
            <p className="text-xs text-secondary leading-relaxed">{group.aiInsight}</p>
          </div>
        )}
      </div>

      {/* App rows */}
      <div className="px-5 pb-4 space-y-2">
        {group.keepApp && (
          <AppRow app={group.keepApp} isKeep={true} />
        )}
        {group.eliminateApps.map((app) => (
          <AppRow key={app.id} app={app} isKeep={false} />
        ))}
      </div>

      {/* Migration steps (collapsible) */}
      <div className="border-t border-border">
        <button
          onClick={() => setExpanded((v) => !v)}
          className="w-full flex items-center justify-between px-5 py-3 text-xs text-secondary hover:text-primary transition-colors"
        >
          <span className="flex items-center gap-2">
            <ArrowRight className="w-3.5 h-3.5 text-accent" />
            {group.migrationSteps.length}-step consolidation plan
          </span>
          {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>

        {expanded && (
          <div className="px-5 pb-5 space-y-2">
            {group.migrationSteps.map((step, i) => (
              <div key={i} className="flex items-start gap-3">
                <div className="w-5 h-5 rounded-full bg-elevated border border-border flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-2xs font-mono text-muted">{i + 1}</span>
                </div>
                <p className="text-xs text-secondary leading-relaxed">{step}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <Card className="p-12 text-center">
      <div className="w-14 h-14 rounded-full bg-accent/10 border border-accent/20 flex items-center justify-center mx-auto mb-4">
        <CheckCircle2 className="w-7 h-7 text-accent" />
      </div>
      <h3 className="font-display font-bold text-primary mb-2">No Redundancies Detected</h3>
      <p className="text-sm text-secondary max-w-sm mx-auto leading-relaxed">
        Your SaaS stack looks clean. Each category has a single primary tool with no significant overlap.
        Run the analysis again after adding more apps.
      </p>
    </Card>
  );
}

// ─── API key prompt ───────────────────────────────────────────────────────────

function AiKeyPrompt() {
  return (
    <div className="flex items-start gap-3 p-4 rounded-lg bg-info/5 border border-info/20">
      <Key className="w-4 h-4 text-info flex-shrink-0 mt-0.5" />
      <div>
        <div className="text-sm font-semibold text-primary mb-0.5">Enable AI-Powered Insights</div>
        <p className="text-xs text-secondary leading-relaxed">
          Add your <code className="font-mono text-info">OPENROUTER_API_KEY</code> to <code className="font-mono text-info">.env</code> to
          get LLM-generated consolidation insights and migration plans tailored to your stack.
          The free model <code className="font-mono text-info">arcee-ai/trinity-large-preview:free</code> is already configured.
        </p>
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export function RedundancyClient({
  analysis: initial,
  aiKeySet,
}: {
  analysis: RedundancyAnalysis;
  aiKeySet: boolean;
}) {
  const [analysis, setAnalysis] = useState(initial);
  const [loading,  setLoading]  = useState(false);

  async function reanalyze() {
    setLoading(true);
    try {
      const res  = await fetch("/api/ai/analyze", { method: "POST" });
      const data = await res.json() as RedundancyAnalysis;
      if (res.ok) setAnalysis(data);
    } finally {
      setLoading(false);
    }
  }

  const annualSavings = analysis.totalPotentialSavings * 12;

  return (
    <div className="p-6 space-y-6">

      {/* Action bar */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2 text-xs text-muted">
          <Brain className="w-3.5 h-3.5 text-accent" />
          {analysis.aiPowered
            ? <span className="text-accent font-medium">AI-powered analysis</span>
            : <span>Heuristic analysis</span>
          }
          <span>·</span>
          <span>Last run {new Date(analysis.analyzedAt).toLocaleString()}</span>
        </div>
        <Button variant="secondary" size="sm" loading={loading} onClick={reanalyze}>
          <RefreshCw className="w-3.5 h-3.5" />
          Re-analyze
        </Button>
      </div>

      {/* AI key prompt (when not set) */}
      {!aiKeySet && <AiKeyPrompt />}

      {/* Summary banner */}
      {analysis.redundantCategories > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            {
              icon:    AlertTriangle,
              label:   "Redundant Groups",
              value:   analysis.redundantCategories,
              suffix:  analysis.redundantCategories === 1 ? "category" : "categories",
              hex:     "#ffb142",
              iconBg:  "rgba(255,177,66,0.12)",
              cardBg:  "rgba(255,177,66,0.07)",
              border:  "rgba(255,177,66,0.25)",
            },
            {
              icon:    TrendingDown,
              label:   "Monthly Savings",
              value:   formatCurrency(analysis.totalPotentialSavings),
              suffix:  "/mo potential",
              hex:     "#00d97e",
              iconBg:  "rgba(0,217,126,0.12)",
              cardBg:  "rgba(0,217,126,0.07)",
              border:  "rgba(0,217,126,0.25)",
            },
            {
              icon:    DollarSign,
              label:   "Annual Impact",
              value:   formatCurrency(annualSavings),
              suffix:  "first-year savings",
              hex:     "#00d97e",
              iconBg:  "rgba(0,217,126,0.12)",
              cardBg:  "rgba(0,217,126,0.05)",
              border:  "rgba(0,217,126,0.2)",
            },
          ].map(({ icon: Icon, label, value, suffix, hex, iconBg, cardBg, border }) => (
            <div key={label} className="flex items-center gap-3 p-4 rounded-xl border" style={{ background: cardBg, borderColor: border }}>
              <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: iconBg }}>
                <Icon className="w-4 h-4" style={{ color: hex }} />
              </div>
              <div>
                <div className="text-2xs text-muted uppercase tracking-wider mb-0.5">{label}</div>
                <div className="font-mono font-bold text-lg" style={{ color: hex }}>{value}</div>
                <div className="text-2xs text-muted">{suffix}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Summary text */}
      <Card>
        <CardBody>
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-accent/10 border border-accent/20 flex items-center justify-center flex-shrink-0">
              {analysis.aiPowered
                ? <Sparkles className="w-4 h-4 text-accent" />
                : <Brain className="w-4 h-4 text-accent" />
              }
            </div>
            <div>
              <div className="text-xs font-semibold text-accent mb-1 uppercase tracking-wider">
                {analysis.aiPowered ? "AI Analysis Summary" : "Analysis Summary"}
              </div>
              <p className="text-sm text-secondary leading-relaxed">{analysis.summary}</p>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Redundancy groups */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2].map((i) => (
            <div key={i} className="h-48 rounded-xl bg-elevated border border-border animate-pulse" />
          ))}
        </div>
      ) : analysis.groups.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-display font-semibold text-sm text-primary">
              Redundancy Groups
            </h2>
            <span className="text-xs text-muted">Sorted by savings potential</span>
          </div>
          {analysis.groups.map((group) => (
            <GroupCard key={group.category} group={group} />
          ))}
        </div>
      )}

      {/* How it works */}
      <Card>
        <CardBody>
          <h3 className="font-display font-semibold text-xs text-primary uppercase tracking-wider mb-3">
            How the Analysis Works
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              {
                icon: Layers,
                title: "Category Grouping",
                desc:  "Tools in the same category are analyzed for functional overlap using 40+ known competing-product pairs.",
              },
              {
                icon: Zap,
                title: "Redundancy Scoring",
                desc:  "Each group gets a 0-100 score based on competitive overlap, utilization similarity, and seat counts.",
              },
              {
                icon: Sparkles,
                title: "AI Consolidation Plan",
                desc:  "When an OpenRouter key is set, an LLM generates tailored migration steps and consolidation insights.",
              },
            ].map(({ icon: Icon, title, desc }) => (
              <div key={title} className="flex items-start gap-3">
                <div className="w-7 h-7 rounded-lg bg-elevated border border-border flex items-center justify-center flex-shrink-0">
                  <Icon className="w-3.5 h-3.5 text-accent" />
                </div>
                <div>
                  <div className="text-xs font-semibold text-primary mb-0.5">{title}</div>
                  <p className="text-2xs text-secondary leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
