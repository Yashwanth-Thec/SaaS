"use client";
import { useState } from "react";
import {
  AlertTriangle, AlertCircle, Info,
  CheckCircle2, X, Zap, RefreshCw, Brain, Sparkles, Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";

interface Alert {
  id: string; type: string; severity: string;
  title: string; body: string; isRead: boolean;
  createdAt: string; appId: string | null;
}

const TYPE_LABELS: Record<string, string> = {
  zombie_app:       "Zombie App",
  renewal_upcoming: "Renewal",
  redundancy:       "Redundancy",
  unused_seats:     "Unused Seats",
  shadow_it:        "Shadow IT",
  budget_exceeded:  "Budget",
};

function SeverityIcon({ severity }: { severity: string }) {
  if (severity === "critical") return <AlertCircle className="w-4 h-4 text-danger flex-shrink-0" />;
  if (severity === "warning")  return <AlertTriangle className="w-4 h-4 text-warning flex-shrink-0" />;
  return <Info className="w-4 h-4 text-info flex-shrink-0" />;
}

function severityBg(s: string) {
  if (s === "critical") return "border-danger/20 bg-danger/5";
  if (s === "warning")  return "border-warning/20 bg-warning/5";
  return "border-info/20 bg-info/5";
}

function severityText(s: string) {
  if (s === "critical") return "text-danger";
  if (s === "warning")  return "text-warning";
  return "text-info";
}

// ─── NL Alert Rule Modal ──────────────────────────────────────────────────────

function NlAlertModal({ onCreated, onClose }: {
  onCreated: (alerts: Alert[]) => void;
  onClose:   () => void;
}) {
  const [rule,    setRule]    = useState("");
  const [loading, setLoading] = useState(false);
  const [result,  setResult]  = useState<{ interpretation: string; alertsCreated: number } | null>(null);
  const [error,   setError]   = useState<string | null>(null);

  async function submit() {
    if (!rule.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res  = await fetch("/api/ai/alert-rule", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ rule }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setResult(data);
      onCreated(data.alerts);
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-surface border border-border rounded-2xl w-full max-w-lg shadow-2xl">
        <div className="flex items-center gap-3 p-5 border-b border-border">
          <div className="w-8 h-8 rounded-lg bg-accent/15 border border-accent/25 flex items-center justify-center">
            <Brain className="w-4 h-4 text-accent" />
          </div>
          <div>
            <div className="font-display font-bold text-sm text-primary">AI Alert Rule</div>
            <div className="text-xs text-muted">Describe a condition in plain English</div>
          </div>
          <button onClick={onClose} className="ml-auto text-muted hover:text-primary">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div>
            <textarea
              value={rule}
              onChange={(e) => setRule(e.target.value)}
              rows={3}
              placeholder='e.g. "Alert me when any app has less than 50% seat utilization" or "Flag all apps over $500/mo with no active users"'
              className="w-full bg-elevated border border-border rounded-xl px-4 py-3 text-sm text-primary placeholder:text-muted focus:outline-none focus:border-accent/50 resize-none"
            />
            <p className="text-xs text-muted mt-1.5">
              Claude will interpret your rule, scan your current app data, and create matching alerts automatically.
            </p>
          </div>

          {/* Examples */}
          <div className="space-y-1.5">
            <div className="text-xs font-semibold text-muted uppercase tracking-wider">Examples</div>
            {[
              "Alert me when any app has less than 30% seat utilization",
              "Flag apps in the security category that are over $200/month",
              "Warn me about any zombie apps — active status but 0 active seats",
            ].map((ex) => (
              <button
                key={ex}
                onClick={() => setRule(ex)}
                className="w-full text-left text-xs text-secondary hover:text-primary px-3 py-2 rounded-lg hover:bg-elevated transition-colors border border-transparent hover:border-border"
              >
                &ldquo;{ex}&rdquo;
              </button>
            ))}
          </div>

          {error && (
            <div className="p-3 rounded-lg bg-danger/8 border border-danger/20 text-xs text-danger">{error}</div>
          )}

          {result && (
            <div className="p-3 rounded-lg bg-accent/8 border border-accent/20 space-y-1">
              <div className="flex items-center gap-1.5 text-xs text-accent font-semibold">
                <Sparkles className="w-3.5 h-3.5" />
                {result.alertsCreated} alert{result.alertsCreated !== 1 ? "s" : ""} created
              </div>
              <p className="text-xs text-secondary">{result.interpretation}</p>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 px-5 pb-5">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={submit} disabled={!rule.trim() || loading || !!result}>
            {loading ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Analyzing…</> : <><Brain className="w-3.5 h-3.5" /> Create Alerts</>}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export function AlertsClient({ initialAlerts }: { initialAlerts: Alert[] }) {
  const [alerts, setAlerts] = useState(initialAlerts);
  const [filter, setFilter] = useState<"all" | "critical" | "warning" | "info">("all");
  const [dismissing, setDismissing] = useState<string | null>(null);
  const [showNlModal, setShowNlModal] = useState(false);

  const filtered = filter === "all" ? alerts : alerts.filter((a) => a.severity === filter);
  const counts = {
    critical: alerts.filter((a) => a.severity === "critical").length,
    warning:  alerts.filter((a) => a.severity === "warning").length,
    info:     alerts.filter((a) => a.severity === "info").length,
  };

  async function dismiss(id: string) {
    setDismissing(id);
    await fetch(`/api/alerts/${id}`, {
      method:  "PATCH",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ isDismissed: true }),
    });
    setAlerts((prev) => prev.filter((a) => a.id !== id));
    setDismissing(null);
  }

  async function dismissAll() {
    await Promise.all(filtered.map((a) =>
      fetch(`/api/alerts/${a.id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isDismissed: true }),
      })
    ));
    setAlerts((prev) => prev.filter((a) => !filtered.find((f) => f.id === a.id)));
  }

  return (
    <div className="p-6 max-w-3xl space-y-5">
      {showNlModal && (
        <NlAlertModal
          onCreated={(newAlerts) => setAlerts((prev) => [...newAlerts, ...prev])}
          onClose={() => setShowNlModal(false)}
        />
      )}

      {/* Summary row */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { key: "critical", label: "Critical", color: "text-danger",  bg: "bg-danger/5  border-danger/20"  },
          { key: "warning",  label: "Warnings", color: "text-warning", bg: "bg-warning/5 border-warning/20" },
          { key: "info",     label: "Info",     color: "text-info",    bg: "bg-info/5    border-info/20"    },
        ].map(({ key, label, color, bg }) => (
          <button
            key={key}
            onClick={() => setFilter(filter === key ? "all" : key as typeof filter)}
            className={`card p-4 text-left transition-all hover:border-current ${filter === key ? bg : ""}`}
          >
            <div className={`font-mono font-bold text-2xl ${color}`}>{counts[key as keyof typeof counts]}</div>
            <div className="text-xs text-secondary mt-0.5">{label}</div>
          </button>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2 text-xs text-muted">
          <Zap className="w-3.5 h-3.5 text-accent" />
          <span>{filtered.length} alert{filtered.length !== 1 ? "s" : ""}{filter !== "all" ? ` (${filter})` : ""}</span>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={() => setShowNlModal(true)}>
            <Brain className="w-3.5 h-3.5" />
            AI Alert Rule
          </Button>
          {filtered.length > 0 && (
            <Button variant="ghost" size="sm" onClick={dismissAll}>
              <CheckCircle2 className="w-3.5 h-3.5" />
              Dismiss {filter === "all" ? "all" : `all ${filter}`}
            </Button>
          )}
        </div>
      </div>

      {/* Alert list */}
      {filtered.length === 0 ? (
        <Card className="py-16 text-center">
          <CheckCircle2 className="w-10 h-10 text-accent mx-auto mb-3" />
          <div className="font-display font-semibold text-base text-primary">All clear</div>
          <div className="text-sm text-secondary mt-1">
            {filter !== "all" ? `No ${filter} alerts.` : "No active alerts. Your stack looks healthy."}
          </div>
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.map((alert) => (
            <div
              key={alert.id}
              className={`flex gap-3 p-4 rounded-lg border transition-all animate-fade-in ${severityBg(alert.severity)}`}
            >
              <SeverityIcon severity={alert.severity} />
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className={`text-sm font-semibold ${severityText(alert.severity)}`}>
                      {alert.title}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <Badge variant="neutral">{TYPE_LABELS[alert.type] ?? alert.type}</Badge>
                      <span className="text-2xs text-muted">
                        {new Date(alert.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => dismiss(alert.id)}
                    className="text-muted hover:text-primary transition-colors flex-shrink-0"
                  >
                    {dismissing === alert.id
                      ? <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      : <X className="w-3.5 h-3.5" />
                    }
                  </button>
                </div>
                <p className="text-xs text-secondary mt-2 leading-relaxed">{alert.body}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
