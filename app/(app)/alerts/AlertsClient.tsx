"use client";
import { useState } from "react";
import {
  AlertTriangle, AlertCircle, Info,
  CheckCircle2, X, Zap, RefreshCw,
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

export function AlertsClient({ initialAlerts }: { initialAlerts: Alert[] }) {
  const [alerts, setAlerts] = useState(initialAlerts);
  const [filter, setFilter] = useState<"all" | "critical" | "warning" | "info">("all");
  const [dismissing, setDismissing] = useState<string | null>(null);

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
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs text-muted">
          <Zap className="w-3.5 h-3.5 text-accent" />
          <span>{filtered.length} alert{filtered.length !== 1 ? "s" : ""}{filter !== "all" ? ` (${filter})` : ""}</span>
        </div>
        {filtered.length > 0 && (
          <Button variant="ghost" size="sm" onClick={dismissAll}>
            <CheckCircle2 className="w-3.5 h-3.5" />
            Dismiss {filter === "all" ? "all" : `all ${filter}`}
          </Button>
        )}
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
