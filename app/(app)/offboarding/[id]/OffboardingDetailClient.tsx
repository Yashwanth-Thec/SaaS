"use client";
import { useState } from "react";
import Link from "next/link";
import {
  CheckCircle2, Circle, SkipForward, AlertCircle,
  Mail, Copy, Check, ArrowLeft, Shield, Database,
  RefreshCw, UserMinus, ChevronDown, ChevronUp,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Card, CardHeader, CardTitle, CardBody } from "@/components/ui/Card";
import { formatCurrency, initials, CATEGORY_COLORS, type AppCategory } from "@/lib/utils";
import type { OffboardingStep } from "@/lib/offboarding";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Progress { done: number; total: number; pct: number; savings: number; isComplete: boolean; }

interface Offboarding {
  id: string; status: string; notes: string | null;
  createdAt: string; completedAt: string | null;
  createdBy: { name: string };
  employee: {
    id: string; name: string; email: string;
    department: string | null; jobTitle: string | null;
  };
  steps: OffboardingStep[];
  progress: Progress;
}

// ─── Step type icons ──────────────────────────────────────────────────────────

function StepIcon({ type }: { type: OffboardingStep["type"] }) {
  if (type === "revoke_access")       return <UserMinus className="w-3.5 h-3.5" />;
  if (type === "transfer_data")       return <Database className="w-3.5 h-3.5" />;
  if (type === "cancel_subscription") return <RefreshCw className="w-3.5 h-3.5" />;
  return <Mail className="w-3.5 h-3.5" />;
}

function stepTypeLabel(type: OffboardingStep["type"]) {
  if (type === "revoke_access")       return "Revoke Access";
  if (type === "transfer_data")       return "Transfer Data";
  if (type === "cancel_subscription") return "Cancel Subscription";
  return "Notify Vendor";
}

function priorityColor(p: OffboardingStep["priority"]) {
  if (p === "high")   return "text-danger border-danger/30 bg-danger/5";
  if (p === "medium") return "text-warning border-warning/30 bg-warning/5";
  return "text-muted border-border bg-elevated";
}

// ─── Email copy modal ─────────────────────────────────────────────────────────

function EmailModal({ email, onClose }: { email: string; onClose: () => void }) {
  const [copied, setCopied] = useState(false);

  function copy() {
    navigator.clipboard.writeText(email);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-base/80 backdrop-blur-sm p-4">
      <Card elevated className="w-full max-w-lg animate-fade-in">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-2">
            <Mail className="w-4 h-4 text-accent" />
            <span className="font-display font-semibold text-sm text-primary">Draft Email</span>
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" size="xs" onClick={copy}>
              {copied ? <Check className="w-3 h-3 text-accent" /> : <Copy className="w-3 h-3" />}
              {copied ? "Copied!" : "Copy"}
            </Button>
            <button onClick={onClose} className="text-muted hover:text-primary text-xs">✕</button>
          </div>
        </div>
        <div className="p-4">
          <pre className="text-xs text-secondary font-mono whitespace-pre-wrap leading-relaxed bg-surface rounded p-3 border border-border max-h-80 overflow-y-auto">
            {email}
          </pre>
        </div>
        <div className="px-4 pb-4">
          <p className="text-2xs text-muted">
            Copy this email and send it to the vendor's support team. After sending, mark the step as done.
          </p>
        </div>
      </Card>
    </div>
  );
}

// ─── Step card ────────────────────────────────────────────────────────────────

function StepCard({
  step,
  onUpdateStatus,
}: {
  step: OffboardingStep;
  onUpdateStatus: (stepId: string, status: OffboardingStep["status"]) => void;
}) {
  const [loading, setLoading]     = useState(false);
  const [showEmail, setShowEmail] = useState(false);
  const [expanded, setExpanded]   = useState(false);
  const isDone    = step.status === "done";
  const isSkipped = step.status === "skipped";
  const isFailed  = step.status === "failed";
  const catColor  = CATEGORY_COLORS[step.category as AppCategory] ?? "#8892a0";

  async function update(status: OffboardingStep["status"]) {
    setLoading(true);
    await onUpdateStatus(step.id, status);
    setLoading(false);
  }

  return (
    <div className={`rounded-lg border transition-all ${
      isDone    ? "border-accent/20 bg-accent/5 opacity-70"  :
      isSkipped ? "border-border bg-surface opacity-50"      :
      isFailed  ? "border-danger/20 bg-danger/5"             :
      "border-border bg-surface hover:border-secondary"
    }`}>
      <div className="flex items-start gap-3 p-4">
        {/* Status indicator */}
        <div className="mt-0.5 flex-shrink-0">
          {isDone    ? <CheckCircle2 className="w-4 h-4 text-accent" />        :
           isSkipped ? <SkipForward  className="w-4 h-4 text-muted" />         :
           isFailed  ? <AlertCircle  className="w-4 h-4 text-danger" />        :
                       <Circle       className="w-4 h-4 text-border" />}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2 flex-wrap">
              {/* App logo */}
              {step.appId && (
                <div
                  className="w-5 h-5 rounded flex items-center justify-center text-2xs font-bold flex-shrink-0"
                  style={{ background: `${catColor}18`, color: catColor }}
                >
                  {step.appName.charAt(0)}
                </div>
              )}
              <span className={`text-sm font-medium ${isDone ? "text-muted line-through" : "text-primary"}`}>
                {step.appName}
              </span>
              <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded border text-2xs ${priorityColor(step.priority)}`}>
                <StepIcon type={step.type} />
                {stepTypeLabel(step.type)}
              </span>
              {step.priority === "high" && !isDone && (
                <span className="flex items-center gap-1 text-2xs text-danger">
                  <Shield className="w-3 h-3" /> High priority
                </span>
              )}
            </div>
            {step.completedAt && (
              <span className="text-2xs text-muted flex-shrink-0">
                {new Date(step.completedAt).toLocaleDateString()}
              </span>
            )}
          </div>

          {/* Notes */}
          <p className="text-xs text-secondary mt-1 leading-relaxed">{step.notes}</p>

          {/* Savings */}
          {step.monthlySpend > 0 && step.type === "revoke_access" && (
            <div className="mt-1.5 text-2xs text-accent font-mono">
              +{formatCurrency(step.monthlySpend)}/mo freed when done
            </div>
          )}

          {/* Actions */}
          {!isDone && !isSkipped && (
            <div className="flex items-center gap-2 mt-3 flex-wrap">
              <Button
                variant="primary"
                size="xs"
                loading={loading}
                onClick={() => update("done")}
              >
                <CheckCircle2 className="w-3 h-3" />
                Mark Done
              </Button>
              {step.draftEmail && (
                <Button variant="secondary" size="xs" onClick={() => setShowEmail(true)}>
                  <Mail className="w-3 h-3" />
                  Draft Email
                </Button>
              )}
              <Button
                variant="ghost"
                size="xs"
                loading={loading}
                onClick={() => update("skipped")}
              >
                <SkipForward className="w-3 h-3" />
                Skip
              </Button>
            </div>
          )}

          {/* Undo for done/skipped */}
          {(isDone || isSkipped) && (
            <button
              onClick={() => update("pending")}
              className="mt-2 text-2xs text-muted hover:text-secondary transition-colors"
            >
              ↩ Undo
            </button>
          )}
        </div>

        {/* Expand toggle (for email preview) */}
        {step.draftEmail && (
          <button
            onClick={() => setExpanded((v) => !v)}
            className="text-muted hover:text-secondary transition-colors flex-shrink-0"
          >
            {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        )}
      </div>

      {expanded && step.draftEmail && (
        <div className="px-4 pb-4 border-t border-border/50 mt-1 pt-3">
          <pre className="text-2xs text-muted font-mono whitespace-pre-wrap leading-relaxed max-h-40 overflow-y-auto">
            {step.draftEmail}
          </pre>
        </div>
      )}

      {showEmail && step.draftEmail && (
        <EmailModal email={step.draftEmail} onClose={() => setShowEmail(false)} />
      )}
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export function OffboardingDetailClient({ offboarding: initial }: { offboarding: Offboarding }) {
  const [offboarding, setOffboarding] = useState(initial);
  const { steps, progress, employee }  = offboarding;

  const highPriority = steps.filter((s) => s.priority === "high"   && s.status === "pending");
  const pending      = steps.filter((s) => s.priority !== "high"   && s.status === "pending");
  const done         = steps.filter((s) => s.status === "done" || s.status === "skipped");

  async function handleUpdateStatus(stepId: string, status: OffboardingStep["status"]) {
    const res  = await fetch(`/api/offboarding/${offboarding.id}/step`, {
      method:  "PATCH",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ stepId, status }),
    });
    if (!res.ok) return;
    const data = await res.json();
    const newSteps = JSON.parse(data.offboarding.steps) as OffboardingStep[];
    setOffboarding((prev) => ({
      ...prev,
      steps:    newSteps,
      status:   data.offboarding.status,
      progress: data.progress,
    }));
  }

  return (
    <div className="p-6 max-w-3xl space-y-6">
      {/* Back */}
      <Link href="/offboarding" className="inline-flex items-center gap-1.5 text-xs text-muted hover:text-primary transition-colors">
        <ArrowLeft className="w-3.5 h-3.5" />
        All offboardings
      </Link>

      {/* Employee + progress */}
      <Card>
        <CardBody>
          <div className="flex items-center gap-4 flex-wrap">
            <div className="w-12 h-12 rounded-full bg-elevated border border-border flex items-center justify-center font-bold text-lg text-primary flex-shrink-0">
              {initials(employee.name)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="font-display font-bold text-lg text-primary">{employee.name}</h2>
                {offboarding.status === "completed"
                  ? <Badge variant="success">Completed</Badge>
                  : <Badge variant="warning">In Progress</Badge>
                }
              </div>
              <div className="text-xs text-secondary mt-0.5">
                {employee.email}
                {employee.department && ` · ${employee.department}`}
                {employee.jobTitle   && ` · ${employee.jobTitle}`}
              </div>

              {/* Progress bar */}
              <div className="mt-3">
                <div className="flex justify-between text-2xs text-muted mb-1">
                  <span>{progress.done} of {progress.total} steps complete</span>
                  <span className="font-mono">{progress.pct}%</span>
                </div>
                <div className="h-2 rounded-full bg-border overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{
                      width: `${progress.pct}%`,
                      background: progress.isComplete ? "#00d97e" : "#ffb142",
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Savings unlocked */}
            <div className="text-right flex-shrink-0">
              <div className="font-mono font-bold text-accent text-xl">
                {formatCurrency(progress.savings)}
              </div>
              <div className="text-2xs text-muted">/mo freed so far</div>
            </div>
          </div>

          {offboarding.notes && (
            <div className="mt-4 pt-4 border-t border-border">
              <div className="text-2xs text-muted uppercase tracking-wider mb-1">Notes</div>
              <p className="text-xs text-secondary">{offboarding.notes}</p>
            </div>
          )}
        </CardBody>
      </Card>

      {/* Completed celebration */}
      {progress.isComplete && (
        <div className="flex items-center gap-3 p-4 rounded-lg bg-accent/10 border border-accent/20 animate-fade-in">
          <CheckCircle2 className="w-5 h-5 text-accent flex-shrink-0" />
          <div>
            <div className="text-sm font-semibold text-accent">Offboarding complete</div>
            <div className="text-xs text-accent/70 mt-0.5">
              All {progress.total} steps resolved · {formatCurrency(progress.savings)}/mo freed
            </div>
          </div>
        </div>
      )}

      {/* High-priority steps */}
      {highPriority.length > 0 && (
        <section>
          <h3 className="text-xs font-semibold text-danger uppercase tracking-wider mb-2">
            ⚠ High Priority — Do First
          </h3>
          <div className="space-y-2">
            {highPriority.map((step) => (
              <StepCard key={step.id} step={step} onUpdateStatus={handleUpdateStatus} />
            ))}
          </div>
        </section>
      )}

      {/* Remaining steps */}
      {pending.length > 0 && (
        <section>
          <h3 className="text-xs font-semibold text-secondary uppercase tracking-wider mb-2">
            Pending — {pending.length} remaining
          </h3>
          <div className="space-y-2">
            {pending.map((step) => (
              <StepCard key={step.id} step={step} onUpdateStatus={handleUpdateStatus} />
            ))}
          </div>
        </section>
      )}

      {/* Completed steps */}
      {done.length > 0 && (
        <section>
          <h3 className="text-xs font-semibold text-muted uppercase tracking-wider mb-2">
            Done — {done.length} steps
          </h3>
          <div className="space-y-2">
            {done.map((step) => (
              <StepCard key={step.id} step={step} onUpdateStatus={handleUpdateStatus} />
            ))}
          </div>
        </section>
      )}

      {/* Footer */}
      <div className="text-xs text-muted border-t border-border pt-4">
        Started {new Date(offboarding.createdAt).toLocaleString()} by {offboarding.createdBy.name}
        {offboarding.completedAt && ` · Completed ${new Date(offboarding.completedAt).toLocaleString()}`}
      </div>
    </div>
  );
}
