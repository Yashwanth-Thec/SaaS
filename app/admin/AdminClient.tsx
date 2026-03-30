"use client";

import { useState } from "react";

type Org = {
  id: string;
  name: string;
  slug: string;
  domain: string | null;
  plan: string;
  status: string;
  createdAt: Date;
  _count: { users: number };
};

const PLAN_OPTIONS = ["starter", "growth", "enterprise", "owner"];
const STATUS_BADGE: Record<string, string> = {
  pending:   "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
  active:    "bg-green-500/10  text-green-400  border-green-500/20",
  suspended: "bg-red-500/10    text-red-400    border-red-500/20",
};

export function AdminClient({ orgs: initial, currentOrgId }: { orgs: Org[]; currentOrgId: string }) {
  const [orgs, setOrgs] = useState(initial);
  const [loading, setLoading] = useState<string | null>(null);

  async function update(orgId: string, patch: { status?: string; plan?: string }) {
    setLoading(orgId);
    try {
      const res = await fetch("/api/admin/orgs", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orgId, ...patch }),
      });
      if (!res.ok) throw new Error("Failed");
      const updated: Org = await res.json();
      setOrgs((prev) => prev.map((o) => (o.id === orgId ? { ...o, ...updated } : o)));
    } catch {
      alert("Update failed — check console");
    } finally {
      setLoading(null);
    }
  }

  const pending   = orgs.filter((o) => o.status === "pending");
  const active    = orgs.filter((o) => o.status === "active");
  const suspended = orgs.filter((o) => o.status === "suspended");

  return (
    <div className="min-h-screen bg-base p-8">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <div className="w-9 h-9 rounded-xl bg-accent flex items-center justify-center">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M12 2L4 6v6c0 5.25 3.5 10.15 8 11.5C16.5 22.15 20 17.25 20 12V6L12 2z" fill="#0a0a0a" />
              <path d="M9 12l2 2 4-4" stroke="#0a0a0a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <div>
            <h1 className="text-xl font-black text-primary tracking-tight">Admin Panel</h1>
            <p className="text-xs text-muted">Manage customer orgs — only visible to you</p>
          </div>
          <a
            href="/dashboard"
            className="ml-auto text-sm text-secondary border border-border rounded-lg px-3 py-1.5 hover:bg-surface transition-colors"
          >
            ← Back to app
          </a>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          {[
            { label: "Pending approval", value: pending.length, color: "text-yellow-400" },
            { label: "Active customers", value: active.length,  color: "text-green-400"  },
            { label: "Suspended",        value: suspended.length, color: "text-red-400"  },
          ].map((s) => (
            <div key={s.label} className="bg-surface border border-border rounded-xl p-4">
              <div className={`text-3xl font-black ${s.color} mb-1`}>{s.value}</div>
              <div className="text-xs text-muted font-medium">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Pending — action required */}
        {pending.length > 0 && (
          <section className="mb-8">
            <h2 className="text-sm font-bold text-yellow-400 uppercase tracking-wider mb-3">
              ⏳ Awaiting Approval
            </h2>
            <OrgTable orgs={pending} loading={loading} onUpdate={update} currentOrgId={currentOrgId} />
          </section>
        )}

        {/* Active */}
        <section className="mb-8">
          <h2 className="text-sm font-bold text-green-400 uppercase tracking-wider mb-3">
            ✓ Active Customers
          </h2>
          {active.length === 0
            ? <p className="text-muted text-sm">No active customers yet.</p>
            : <OrgTable orgs={active} loading={loading} onUpdate={update} currentOrgId={currentOrgId} />}
        </section>

        {/* Suspended */}
        {suspended.length > 0 && (
          <section>
            <h2 className="text-sm font-bold text-red-400 uppercase tracking-wider mb-3">
              🔒 Suspended
            </h2>
            <OrgTable orgs={suspended} loading={loading} onUpdate={update} currentOrgId={currentOrgId} />
          </section>
        )}
      </div>
    </div>
  );
}

function OrgTable({
  orgs, loading, onUpdate, currentOrgId,
}: {
  orgs: Org[];
  loading: string | null;
  onUpdate: (id: string, patch: { status?: string; plan?: string }) => void;
  currentOrgId: string;
}) {
  return (
    <div className="bg-surface border border-border rounded-xl overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border">
            <th className="text-left px-4 py-3 text-muted font-medium text-xs uppercase tracking-wider">Org</th>
            <th className="text-left px-4 py-3 text-muted font-medium text-xs uppercase tracking-wider">Users</th>
            <th className="text-left px-4 py-3 text-muted font-medium text-xs uppercase tracking-wider">Status</th>
            <th className="text-left px-4 py-3 text-muted font-medium text-xs uppercase tracking-wider">Plan</th>
            <th className="text-left px-4 py-3 text-muted font-medium text-xs uppercase tracking-wider">Actions</th>
          </tr>
        </thead>
        <tbody>
          {orgs.map((org) => {
            const isOwn = org.id === currentOrgId;
            const busy  = loading === org.id;
            return (
              <tr key={org.id} className="border-b border-border last:border-0 hover:bg-base/50 transition-colors">
                <td className="px-4 py-3">
                  <div className="font-semibold text-primary flex items-center gap-2">
                    {org.name}
                    {isOwn && <span className="text-xs bg-accent/20 text-accent border border-accent/30 rounded-full px-1.5 py-0.5">you</span>}
                  </div>
                  <div className="text-xs text-muted">{org.domain ?? org.slug}</div>
                </td>
                <td className="px-4 py-3 text-secondary">{org._count.users}</td>
                <td className="px-4 py-3">
                  <span className={`text-xs font-semibold border rounded-full px-2 py-0.5 ${STATUS_BADGE[org.status] ?? ""}`}>
                    {org.status}
                  </span>
                </td>
                <td className="px-4 py-3">
                  {isOwn ? (
                    <span className="text-xs text-muted">{org.plan}</span>
                  ) : (
                    <select
                      value={org.plan}
                      disabled={busy}
                      onChange={(e) => onUpdate(org.id, { plan: e.target.value })}
                      className="bg-base border border-border rounded-lg px-2 py-1 text-xs text-primary focus:outline-none focus:border-accent"
                    >
                      {["starter", "growth", "enterprise"].map((p) => (
                        <option key={p} value={p}>{p}</option>
                      ))}
                    </select>
                  )}
                </td>
                <td className="px-4 py-3">
                  {isOwn ? (
                    <span className="text-xs text-muted">—</span>
                  ) : (
                    <div className="flex gap-2">
                      {org.status !== "active" && (
                        <button
                          disabled={busy}
                          onClick={() => onUpdate(org.id, { status: "active" })}
                          className="text-xs bg-green-500/10 text-green-400 border border-green-500/20 rounded-lg px-2.5 py-1 hover:bg-green-500/20 transition-colors disabled:opacity-40"
                        >
                          {busy ? "…" : "Approve"}
                        </button>
                      )}
                      {org.status !== "suspended" && (
                        <button
                          disabled={busy}
                          onClick={() => onUpdate(org.id, { status: "suspended" })}
                          className="text-xs bg-red-500/10 text-red-400 border border-red-500/20 rounded-lg px-2.5 py-1 hover:bg-red-500/20 transition-colors disabled:opacity-40"
                        >
                          {busy ? "…" : "Suspend"}
                        </button>
                      )}
                      {org.status !== "pending" && (
                        <button
                          disabled={busy}
                          onClick={() => onUpdate(org.id, { status: "pending" })}
                          className="text-xs bg-surface text-muted border border-border rounded-lg px-2.5 py-1 hover:bg-base transition-colors disabled:opacity-40"
                        >
                          {busy ? "…" : "Revoke"}
                        </button>
                      )}
                    </div>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
