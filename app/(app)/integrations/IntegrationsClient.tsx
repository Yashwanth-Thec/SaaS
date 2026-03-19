"use client";
import { useState, useCallback, useRef, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  CheckCircle2, AlertCircle, Clock, RefreshCw,
  Upload, ExternalLink, Plug, ChevronDown,
  FileText, Download,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { CSV_TEMPLATES } from "@/lib/integrations/categories";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ConnectionState {
  status:     string;
  lastSyncAt: string | null;
  syncCount:  number;
  lastError:  string | null;
}

interface Props {
  connected: Record<string, ConnectionState>;
}

// ─── Integration definitions ──────────────────────────────────────────────────

const INTEGRATIONS = [
  {
    type:        "google_workspace",
    name:        "Google Workspace",
    description: "Discover all employees, OAuth-authorized apps, and login activity from your Google admin console.",
    logo:        "G",
    logoColor:   "#4285F4",
    category:    "Identity & Directory",
    what:        ["All org users → Employees", "Authorized OAuth apps → SaaS Stack", "Login activity → Utilization"],
    envKeys:     ["GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET"],
    action:      "oauth",
    connectUrl:  "/api/integrations/google/auth",
    docsHint:    "Requires Google Workspace Admin (Super Admin or Reports Admin role).",
  },
  {
    type:        "okta",
    name:        "Okta",
    description: "Import your Okta directory and app assignments to map every employee to every app they can access.",
    logo:        "O",
    logoColor:   "#007DC1",
    category:    "Identity & Directory",
    what:        ["Users & groups → Employees", "App assignments → AppAccess", "Last login dates"],
    envKeys:     ["OKTA_DOMAIN", "OKTA_API_TOKEN"],
    action:      "oauth",
    comingSoon:  true,
  },
  {
    type:        "azure_ad",
    name:        "Microsoft Entra ID",
    description: "Connect Azure Active Directory to pull users, groups, and Microsoft 365 license assignments.",
    logo:        "M",
    logoColor:   "#0078D4",
    category:    "Identity & Directory",
    what:        ["Azure AD users → Employees", "M365 license assignments", "App registrations"],
    envKeys:     ["AZURE_CLIENT_ID", "AZURE_CLIENT_SECRET", "AZURE_TENANT_ID"],
    action:      "oauth",
    comingSoon:  true,
  },
  {
    type:        "plaid",
    name:        "Bank Feed (Plaid)",
    description: "Connect your corporate bank account or credit card to automatically detect SaaS charges and shadow IT spending.",
    logo:        "$",
    logoColor:   "#00D97E",
    category:    "Financial",
    what:        ["Recurring SaaS charges → Apps", "Shadow IT detection", "90-day spend history"],
    envKeys:     ["PLAID_CLIENT_ID", "PLAID_SECRET"],
    action:      "plaid",
    docsHint:    "Sandbox: username user_good / password pass_good",
  },
  {
    type:        "csv",
    name:        "CSV Import",
    description: "Upload a CSV export from your bank, existing spreadsheet, or HR system. Auto-detects format.",
    logo:        "📄",
    logoColor:   "#8892A0",
    category:    "Manual",
    what:        ["Bank statement → Spend records", "App inventory → SaaS Stack", "Employee list → People"],
    action:      "csv",
  },
  {
    type:        "hris_rippling",
    name:        "Rippling HRIS",
    description: "Connect Rippling to auto-provision and de-provision app access when employees join or leave.",
    logo:        "R",
    logoColor:   "#FF6B35",
    category:    "HRIS",
    what:        ["New hires → auto-provision", "Terminations → auto-offboard", "Department mapping"],
    envKeys:     ["RIPPLING_API_KEY"],
    action:      "oauth",
    comingSoon:  true,
  },
] as const;

// ─── Status display ───────────────────────────────────────────────────────────

function ConnectionStatus({ state }: { state: ConnectionState | undefined }) {
  if (!state) return null;

  if (state.status === "connected") {
    const syncedAt = state.lastSyncAt
      ? new Date(state.lastSyncAt).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })
      : "Never";
    return (
      <div className="flex items-center gap-1.5">
        <CheckCircle2 className="w-3.5 h-3.5 text-accent" />
        <span className="text-xs text-accent font-medium">Connected</span>
        <span className="text-2xs text-muted">· synced {syncedAt}</span>
      </div>
    );
  }
  if (state.status === "syncing") {
    return (
      <div className="flex items-center gap-1.5">
        <RefreshCw className="w-3.5 h-3.5 text-info animate-spin" />
        <span className="text-xs text-info">Syncing…</span>
      </div>
    );
  }
  if (state.status === "error") {
    return (
      <div className="flex flex-col gap-0.5">
        <div className="flex items-center gap-1.5">
          <AlertCircle className="w-3.5 h-3.5 text-danger" />
          <span className="text-xs text-danger font-medium">Error</span>
        </div>
        {state.lastError && (
          <span className="text-2xs text-secondary">{state.lastError}</span>
        )}
      </div>
    );
  }
  if (state.status === "pending") {
    return (
      <div className="flex items-center gap-1.5">
        <Clock className="w-3.5 h-3.5 text-warning" />
        <span className="text-xs text-warning">Pending</span>
      </div>
    );
  }
  return null;
}

// ─── CSV Uploader ─────────────────────────────────────────────────────────────

function CsvUploader({ onSuccess }: { onSuccess: (msg: string) => void }) {
  const [dragging, setDragging]   = useState(false);
  const [uploading, setUploading] = useState(false);
  const [result, setResult]       = useState<string | null>(null);
  const [error, setError]         = useState<string | null>(null);
  const [showTemplates, setShowTemplates] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const upload = useCallback(async (file: File) => {
    setUploading(true);
    setError(null);
    setResult(null);
    try {
      const form = new FormData();
      form.append("file", file);
      const res  = await fetch("/api/integrations/csv", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) { setError(data.error); return; }

      const msg = [
        `Detected: ${data.format.replace("_", " ")}`,
        `${data.rowCount} rows processed`,
        data.result.employees?.upserted ? `${data.result.employees.upserted} employees` : null,
        data.result.apps?.upserted + data.result.apps?.discovered
          ? `${data.result.apps.upserted + data.result.apps.discovered} apps` : null,
        data.result.spend?.created ? `${data.result.spend.created} spend records` : null,
      ].filter(Boolean).join(" · ");

      setResult(msg);
      onSuccess(msg);
    } catch { setError("Upload failed. Please try again."); }
    finally   { setUploading(false); }
  }, [onSuccess]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) upload(file);
  }, [upload]);

  function downloadTemplate(key: keyof typeof CSV_TEMPLATES) {
    const blob = new Blob([CSV_TEMPLATES[key]], { type: "text/csv" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href     = url;
    a.download = `${key}-template.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-3">
      {/* Drop zone */}
      <div
        className={`relative border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-all ${
          dragging ? "border-accent bg-accent-dim" : "border-border hover:border-secondary"
        }`}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => fileRef.current?.click()}
      >
        <Upload className={`w-8 h-8 mx-auto mb-2 ${dragging ? "text-accent" : "text-muted"}`} />
        <div className="text-sm text-primary font-medium">
          {uploading ? "Uploading…" : "Drop CSV here or click to browse"}
        </div>
        <div className="text-xs text-muted mt-1">
          Bank statement · App inventory · Employee list — auto-detected
        </div>
        <input
          ref={fileRef}
          type="file"
          accept=".csv"
          className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) upload(f); }}
        />
      </div>

      {/* Result / error */}
      {result && (
        <div className="flex items-start gap-2 px-3 py-2.5 rounded bg-accent/10 border border-accent/20 text-xs text-accent">
          <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
          {result}
        </div>
      )}
      {error && (
        <div className="flex items-start gap-2 px-3 py-2.5 rounded bg-danger/10 border border-danger/20 text-xs text-danger">
          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
          {error}
        </div>
      )}

      {/* Template download */}
      <button
        className="flex items-center gap-1.5 text-xs text-secondary hover:text-primary transition-colors"
        onClick={(e) => { e.stopPropagation(); setShowTemplates((v) => !v); }}
      >
        <Download className="w-3 h-3" />
        Download templates
        <ChevronDown className={`w-3 h-3 transition-transform ${showTemplates ? "rotate-180" : ""}`} />
      </button>

      {showTemplates && (
        <div className="flex flex-wrap gap-2">
          {(["app_inventory", "bank_statement", "employee_list"] as const).map((key) => (
            <button
              key={key}
              onClick={() => downloadTemplate(key)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded bg-elevated border border-border text-xs text-secondary hover:text-primary hover:border-secondary transition-all"
            >
              <FileText className="w-3 h-3" />
              {key.replace("_", " ")}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Plaid Connect Button ─────────────────────────────────────────────────────

function PlaidConnect({ onSuccess }: { onSuccess: (msg: string) => void }) {
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);

  async function handleConnect() {
    setLoading(true);
    setError(null);
    try {
      const res  = await fetch("/api/integrations/plaid/link", { method: "POST" });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error);
        return;
      }

      // Dynamically load Plaid Link script
      await loadPlaidScript();
      const handler = (window as any).Plaid.create({
        token:     data.link_token,
        onSuccess: async (publicToken: string, metadata: any) => {
          const exRes = await fetch("/api/integrations/plaid/exchange", {
            method:  "POST",
            headers: { "Content-Type": "application/json" },
            body:    JSON.stringify({
              public_token:     publicToken,
              institution_name: metadata?.institution?.name,
            }),
          });
          const exData = await exRes.json();
          if (!exRes.ok) { setError(exData.error); return; }
          onSuccess(`Bank connected · ${exData.result?.apps?.discovered ?? 0} apps found · ${exData.shadowItCount ?? 0} shadow IT charges`);
        },
        onExit: () => setLoading(false),
      });
      handler.open();
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-2">
      <Button onClick={handleConnect} loading={loading} variant="primary" size="sm">
        Connect Bank Account
      </Button>
      {error && (
        <p className="text-xs text-danger">{error}</p>
      )}
      <p className="text-xs text-muted">
        Sandbox: username <code className="font-mono bg-elevated px-1 rounded">user_good</code>{" "}
        password <code className="font-mono bg-elevated px-1 rounded">pass_good</code>
      </p>
    </div>
  );
}

function loadPlaidScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if ((window as any).Plaid) { resolve(); return; }
    const script  = document.createElement("script");
    script.src    = "https://cdn.plaid.com/link/v2/stable/link-initialize.js";
    script.onload = () => resolve();
    script.onerror= () => reject(new Error("Failed to load Plaid script"));
    document.head.appendChild(script);
  });
}

// ─── Integration Card ─────────────────────────────────────────────────────────

function IntegrationCard({
  integration,
  state,
  onSync,
  onSuccess,
}: {
  integration: (typeof INTEGRATIONS)[number];
  state: ConnectionState | undefined;
  onSync: (type: string) => void;
  onSuccess: (msg: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const isConnected = state?.status === "connected";
  const isSyncing   = state?.status === "syncing";

  return (
    <Card className={`transition-all ${isConnected ? "border-accent/25" : ""}`}>
      <div className="p-5">
        <div className="flex items-start gap-4">
          {/* Logo */}
          <div
            className="w-10 h-10 rounded-lg flex items-center justify-center font-bold text-sm flex-shrink-0"
            style={{
              background: `${integration.logoColor}18`,
              color:      integration.logoColor,
              border:     `1px solid ${integration.logoColor}30`,
            }}
          >
            {integration.logo}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-display font-semibold text-sm text-primary">
                {integration.name}
              </h3>
              <Badge variant="neutral">{integration.category}</Badge>
              {"comingSoon" in integration && integration.comingSoon && (
                <Badge variant="info">Coming soon</Badge>
              )}
              {isConnected && (
                <Badge variant="success">Connected</Badge>
              )}
            </div>

            <p className="text-xs text-secondary mt-1 leading-relaxed">
              {integration.description}
            </p>

            {state && (
              <div className="mt-2">
                <ConnectionStatus state={state} />
              </div>
            )}
          </div>

          {/* Action */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {isConnected && integration.type !== "csv" && (
              <Button
                variant="ghost"
                size="xs"
                loading={isSyncing}
                onClick={() => onSync(integration.type)}
              >
                <RefreshCw className="w-3 h-3" />
                Sync
              </Button>
            )}
            <button
              className="text-muted hover:text-secondary transition-colors"
              onClick={() => setExpanded((v) => !v)}
            >
              <ChevronDown className={`w-4 h-4 transition-transform ${expanded ? "rotate-180" : ""}`} />
            </button>
          </div>
        </div>

        {/* Expanded: what it does + connect action */}
        {expanded && (
          <div className="mt-4 pt-4 border-t border-border space-y-4 animate-fade-in">
            {/* What it discovers */}
            <div>
              <div className="text-2xs text-muted uppercase tracking-wider font-semibold mb-2">What gets imported</div>
              <ul className="space-y-1">
                {integration.what.map((item) => (
                  <li key={item} className="flex items-center gap-2 text-xs text-secondary">
                    <div className="w-1.5 h-1.5 rounded-full bg-accent flex-shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>


            {"docsHint" in integration && integration.docsHint && (
              <p className="text-xs text-secondary flex items-start gap-1.5">
                <ExternalLink className="w-3 h-3 mt-0.5 flex-shrink-0 text-muted" />
                {integration.docsHint}
              </p>
            )}

            {/* Connect actions */}
            {"comingSoon" in integration && integration.comingSoon ? (
              <Button variant="secondary" size="sm" disabled>
                Coming Soon
              </Button>
            ) : integration.type === "csv" ? (
              <CsvUploader onSuccess={onSuccess} />
            ) : integration.type === "plaid" && !isConnected ? (
              <PlaidConnect onSuccess={onSuccess} />
            ) : integration.action === "oauth" && !isConnected ? (
              <a href={"connectUrl" in integration ? integration.connectUrl : `/api/integrations/${integration.type}/auth`}>
                <Button variant="primary" size="sm">
                  <Plug className="w-3.5 h-3.5" />
                  Connect {integration.name}
                </Button>
              </a>
            ) : null}
          </div>
        )}
      </div>
    </Card>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

const ERROR_MESSAGES: Record<string, string> = {
  google_not_configured: "Google Workspace requires GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in your .env file.",
  auth_failed:           "Google authentication failed. Check your credentials and try again.",
  sync_failed:           "Google sync failed. Check server logs for details.",
  missing_code:          "OAuth flow was cancelled or incomplete. Please try again.",
};

export function IntegrationsClient({ connected }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [connectedState, setConnectedState] = useState(connected);
  const [toast,     setToast]     = useState<string | null>(null);
  const [toastType, setToastType] = useState<"success" | "error">("success");
  const [syncing,   setSyncing]   = useState<string | null>(null);

  // Read ?error or ?success from redirect params (e.g. after Google OAuth)
  useEffect(() => {
    const error   = searchParams.get("error");
    const success = searchParams.get("success");

    if (error) {
      const msg = ERROR_MESSAGES[error] ?? "Something went wrong. Please try again.";
      setToastType("error");
      setToast(msg);
      setTimeout(() => setToast(null), 7000);
      router.replace("/integrations");
    } else if (success === "google_connected") {
      const employees = searchParams.get("employees") ?? "0";
      const apps      = searchParams.get("apps")      ?? "0";
      setToastType("success");
      setToast(`Google Workspace connected · ${employees} employees · ${apps} apps imported`);
      setTimeout(() => setToast(null), 6000);
      router.replace("/integrations");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function showToast(msg: string, type: "success" | "error" = "success") {
    setToastType(type);
    setToast(msg);
    setTimeout(() => setToast(null), 5000);
  }

  async function handleSync(type: string) {
    setSyncing(type);
    try {
      const res  = await fetch(`/api/integrations/${type}/sync`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) { showToast(`Sync failed: ${data.error}`, "error"); return; }
      showToast(`Sync complete · ${data.result?.apps?.upserted ?? 0} apps updated`);
      setConnectedState((prev) => ({
        ...prev,
        [type]: { ...prev[type], status: "connected", lastSyncAt: new Date().toISOString() },
      }));
    } catch { showToast("Sync failed"); }
    finally  { setSyncing(null); }
  }

  function handleSuccess(msg: string) {
    showToast(msg);
    // Refetch would happen here; for now just update CSV state
    setConnectedState((prev) => ({
      ...prev,
      csv: { status: "connected", lastSyncAt: new Date().toISOString(), syncCount: 1, lastError: null },
    }));
  }

  const byCategory = INTEGRATIONS.reduce((acc, i) => {
    const cat = "comingSoon" in i && i.comingSoon ? "Coming Soon" : i.category;
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(i);
    return acc;
  }, {} as Record<string, typeof INTEGRATIONS[number][]>);

  const categoryOrder = ["Identity & Directory", "Financial", "Manual", "HRIS", "Coming Soon"];

  return (
    <div className="p-6 space-y-8 max-w-3xl">
      {/* Status bar */}
      <div className="flex items-center gap-4 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-accent" />
          <span className="text-secondary">
            <span className="font-mono font-bold text-primary">
              {Object.values(connectedState).filter((s) => s.status === "connected").length}
            </span>
            {" "}connected
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-border" />
          <span className="text-secondary">
            <span className="font-mono font-bold text-primary">
              {INTEGRATIONS.length - Object.values(connectedState).filter((s) => s.status === "connected").length}
            </span>
            {" "}available
          </span>
        </div>
      </div>

      {/* Cards by category */}
      {categoryOrder.map((cat) => {
        const items = byCategory[cat];
        if (!items?.length) return null;
        return (
          <section key={cat}>
            <h2 className="text-xs font-semibold text-muted uppercase tracking-widest mb-3">{cat}</h2>
            <div className="space-y-3">
              {items.map((integration) => (
                <IntegrationCard
                  key={integration.type}
                  integration={integration}
                  state={connectedState[integration.type]}
                  onSync={handleSync}
                  onSuccess={handleSuccess}
                />
              ))}
            </div>
          </section>
        );
      })}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-fade-in max-w-sm w-full px-4">
          <div className={`flex items-start gap-2 px-4 py-3 rounded-lg shadow-card text-sm text-primary border ${
            toastType === "error"
              ? "bg-elevated border-danger/30"
              : "bg-elevated border-accent/30"
          }`}>
            {toastType === "error"
              ? <AlertCircle className="w-4 h-4 text-danger flex-shrink-0 mt-0.5" />
              : <CheckCircle2 className="w-4 h-4 text-accent flex-shrink-0 mt-0.5" />
            }
            <span className="leading-snug">{toast}</span>
          </div>
        </div>
      )}
    </div>
  );
}
