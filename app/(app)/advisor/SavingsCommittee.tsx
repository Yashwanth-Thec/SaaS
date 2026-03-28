"use client";
import { useState } from "react";
import { Users, Loader2, ChevronDown, ChevronUp, Sparkles, DollarSign, CheckCircle2, ArrowRight } from "lucide-react";
import { Button }   from "@/components/ui/Button";
import { Card, CardBody } from "@/components/ui/Card";
import { formatCurrency } from "@/lib/utils";
import type { SavingsPlan, AgentPerspective } from "@/lib/ai/savings-committee";

// ─── Agent card ───────────────────────────────────────────────────────────────

function AgentCard({ p }: { p: AgentPerspective }) {
  const [open, setOpen] = useState(false);

  return (
    <Card elevated>
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full p-4 flex items-center gap-3 text-left"
      >
        <div className="text-2xl leading-none">{p.emoji}</div>
        <div className="flex-1">
          <div className="font-display font-bold text-sm text-primary">{p.label}</div>
          <div className="text-xs text-secondary mt-0.5 line-clamp-1">{p.topAction}</div>
        </div>
        {p.savings && (
          <div className="text-xs font-mono font-bold text-accent mr-2">{p.savings}</div>
        )}
        {open ? <ChevronUp className="w-4 h-4 text-muted flex-shrink-0" /> : <ChevronDown className="w-4 h-4 text-muted flex-shrink-0" />}
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-2 border-t border-border pt-3">
          <div className="text-xs font-semibold text-muted uppercase tracking-wider mb-2">Findings</div>
          {p.findings.map((f, i) => (
            <div key={i} className="flex items-start gap-2">
              <div className="w-4 h-4 rounded-full bg-elevated border border-border flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-2xs text-muted font-mono">{i + 1}</span>
              </div>
              <p className="text-xs text-secondary leading-relaxed">{f}</p>
            </div>
          ))}
          <div className="mt-3 p-3 rounded-lg bg-accent/5 border border-accent/15">
            <div className="text-2xs font-semibold text-accent uppercase tracking-wider mb-1">Top Action</div>
            <p className="text-xs text-secondary leading-relaxed">{p.topAction}</p>
          </div>
        </div>
      )}
    </Card>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export function SavingsCommittee() {
  const [plan,    setPlan]    = useState<SavingsPlan | null>(null);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);

  async function run() {
    setLoading(true);
    setError(null);
    try {
      const res  = await fetch("/api/ai/savings-plan", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed");
      setPlan(data);
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display font-bold text-base text-primary flex items-center gap-2">
            <Users className="w-5 h-5 text-accent" />
            Multi-Agent Savings Committee
          </h2>
          <p className="text-xs text-muted mt-1">
            3 specialized Claude agents analyze your stack in parallel — CFO, IT Risk, and Vendor Negotiator — then synthesize a consensus plan.
          </p>
        </div>
        <Button onClick={run} loading={loading} disabled={loading}>
          {loading ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> Running agents…</>
          ) : (
            <><Sparkles className="w-4 h-4" /> Run Committee</>
          )}
        </Button>
      </div>

      {/* Architecture diagram */}
      {!plan && !loading && (
        <Card>
          <CardBody>
            <div className="flex items-center justify-between text-xs text-muted flex-wrap gap-3">
              {[
                { emoji: "💰", label: "CFO Advisor", desc: "Cost, ROI, waste" },
                { emoji: "🛡️", label: "IT Risk",     desc: "Security, compliance" },
                { emoji: "🤝", label: "Vendor Expert", desc: "Contracts, leverage" },
              ].map((a, i) => (
                <div key={i} className="flex flex-col items-center gap-2 flex-1">
                  <div className="w-12 h-12 rounded-xl bg-elevated border border-border flex items-center justify-center text-xl">
                    {a.emoji}
                  </div>
                  <div className="font-semibold text-secondary">{a.label}</div>
                  <div className="text-muted text-center">{a.desc}</div>
                </div>
              ))}
            </div>
            <div className="flex items-center justify-center gap-2 mt-4 pt-4 border-t border-border text-xs text-muted">
              <ArrowRight className="w-4 h-4 text-accent" />
              <span>All 3 run in <strong className="text-secondary">parallel</strong> via <code className="font-mono text-accent">Promise.all()</code>, then a 4th synthesis call unifies the output</span>
            </div>
          </CardBody>
        </Card>
      )}

      {error && (
        <div className="p-4 rounded-lg bg-danger/8 border border-danger/20 text-xs text-danger">{error}</div>
      )}

      {loading && (
        <div className="space-y-3">
          {["CFO Advisor", "IT Risk & Security", "Vendor Negotiator"].map((label) => (
            <div key={label} className="h-16 rounded-xl bg-elevated border border-border animate-pulse flex items-center px-4 gap-3">
              <Loader2 className="w-4 h-4 text-accent animate-spin" />
              <span className="text-sm text-muted">{label} analyzing…</span>
            </div>
          ))}
          <div className="h-16 rounded-xl bg-accent/5 border border-accent/20 animate-pulse flex items-center px-4 gap-3">
            <Sparkles className="w-4 h-4 text-accent animate-pulse" />
            <span className="text-sm text-accent/70">Synthesis agent unifying perspectives…</span>
          </div>
        </div>
      )}

      {plan && (
        <>
          {/* Savings banner */}
          {plan.totalSavings > 0 && (
            <div className="flex items-center gap-4 p-4 rounded-xl border" style={{ background: "rgba(0,217,126,0.07)", borderColor: "rgba(0,217,126,0.25)" }}>
              <div className="w-10 h-10 rounded-xl bg-accent/15 flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-accent" />
              </div>
              <div>
                <div className="text-2xs uppercase tracking-wider text-accent/70 font-semibold">Committee Estimate</div>
                <div className="font-mono font-bold text-2xl text-accent">{formatCurrency(plan.totalSavings)}<span className="text-sm font-normal opacity-70">/mo</span></div>
                <div className="text-xs text-muted">{formatCurrency(plan.totalSavings * 12)} annually</div>
              </div>
            </div>
          )}

          {/* Synthesis */}
          <Card>
            <CardBody>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-accent/10 border border-accent/20 flex items-center justify-center flex-shrink-0">
                  <Sparkles className="w-4 h-4 text-accent" />
                </div>
                <div>
                  <div className="text-xs font-semibold text-accent uppercase tracking-wider mb-1.5">Synthesis</div>
                  <p className="text-sm text-secondary leading-relaxed">{plan.synthesis}</p>
                </div>
              </div>
            </CardBody>
          </Card>

          {/* Priority actions */}
          <Card>
            <CardBody>
              <div className="text-xs font-semibold text-primary uppercase tracking-wider mb-3">Priority Actions</div>
              <div className="space-y-2">
                {plan.priorityActions.map((action, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${i === 0 ? "bg-accent text-base" : "bg-elevated border border-border"}`}>
                      {i === 0 ? <CheckCircle2 className="w-3 h-3" /> : <span className="text-2xs font-mono text-muted">{i + 1}</span>}
                    </div>
                    <p className="text-xs text-secondary leading-relaxed">{action}</p>
                  </div>
                ))}
              </div>
            </CardBody>
          </Card>

          {/* Agent cards */}
          <div className="space-y-3">
            <div className="text-xs font-semibold text-primary uppercase tracking-wider">Agent Perspectives</div>
            {plan.perspectives.map((p) => <AgentCard key={p.agent} p={p} />)}
          </div>
        </>
      )}
    </div>
  );
}
