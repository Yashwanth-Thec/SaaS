'use client';
import { useState } from 'react';
import { Bell, Building2, Users, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Props {
  org: { id: string; name: string; slug: string; domain: string | null; plan: string };
  users: { id: string; name: string; email: string; role: string; createdAt: string }[];
  slackWebhookUrl: string | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function planBadgeVariant(plan: string): 'default' | 'success' | 'info' | 'warning' {
  if (plan === 'growth' || plan === 'enterprise') return 'success';
  if (plan === 'starter') return 'info';
  return 'default';
}

function roleBadgeVariant(role: string): 'default' | 'success' | 'info' {
  if (role === 'owner') return 'success';
  if (role === 'admin') return 'info';
  return 'default';
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

// ─── Status message ───────────────────────────────────────────────────────────

function StatusMessage({ type, text }: { type: 'success' | 'error'; text: string }) {
  return (
    <div
      className={`flex items-center gap-2 text-sm p-3 rounded-md border ${
        type === 'success'
          ? 'bg-accent/5 border-accent/20 text-accent'
          : 'bg-danger/5 border-danger/20 text-danger'
      }`}
    >
      {type === 'success' ? (
        <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
      ) : (
        <AlertCircle className="w-4 h-4 flex-shrink-0" />
      )}
      {text}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function SettingsClient({ org, users, slackWebhookUrl }: Props) {
  const [webhookUrl, setWebhookUrl] = useState(slackWebhookUrl ?? '');
  const [saving, setSaving]         = useState(false);
  const [testing, setTesting]       = useState(false);
  const [status, setStatus]         = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  async function handleSave() {
    setSaving(true);
    setStatus(null);
    try {
      const res = await fetch('/api/integrations/slack', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ webhookUrl }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setStatus({ type: 'success', text: 'Webhook URL saved successfully.' });
      } else {
        setStatus({ type: 'error', text: data.error ?? 'Failed to save webhook URL.' });
      }
    } catch {
      setStatus({ type: 'error', text: 'Network error. Please try again.' });
    } finally {
      setSaving(false);
    }
  }

  async function handleTest() {
    setTesting(true);
    setStatus(null);
    try {
      const res = await fetch('/api/integrations/slack/test', { method: 'POST' });
      const data = await res.json();
      if (res.ok && data.success) {
        setStatus({ type: 'success', text: data.message ?? 'Test message sent!' });
      } else {
        setStatus({ type: 'error', text: data.error ?? 'Test failed.' });
      }
    } catch {
      setStatus({ type: 'error', text: 'Network error. Please try again.' });
    } finally {
      setTesting(false);
    }
  }

  return (
    <div className="p-6 animate-fade-in">
      <div className="max-w-2xl space-y-6">

        {/* ── Section 1: Workspace ── */}
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <Building2 className="w-4 h-4 text-muted" />
            <h2 className="font-display font-semibold text-lg text-primary">Workspace</h2>
          </div>

          <div className="space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-display font-bold text-2xl text-primary">{org.name}</p>
                <div className="mt-1">
                  <Badge variant={planBadgeVariant(org.plan)} size="sm">
                    {org.plan.charAt(0).toUpperCase() + org.plan.slice(1)} Plan
                  </Badge>
                </div>
              </div>
              <div title="Contact support to change">
                <Button variant="secondary" size="sm" disabled>
                  Edit workspace
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-2 border-t border-border">
              <div>
                <p className="text-xs text-muted mb-0.5">Slug</p>
                <p className="font-mono text-sm text-secondary">{org.slug}</p>
              </div>
              <div>
                <p className="text-xs text-muted mb-0.5">Domain</p>
                <p className="font-mono text-sm text-secondary">{org.domain ?? '—'}</p>
              </div>
            </div>

            <p className="text-xs text-muted">
              To change your workspace name or domain, contact support.
            </p>
          </div>
        </Card>

        {/* ── Section 2: Slack Notifications ── */}
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-1">
            <Bell className="w-4 h-4 text-muted" />
            <h2 className="font-display font-semibold text-lg text-primary">Slack Alerts</h2>
          </div>
          <p className="text-sm text-secondary mb-4">
            Get real-time alerts in Slack when SaaS-Scrub detects waste, zombie apps, or upcoming renewals.
          </p>

          <div className="space-y-3">
            <div>
              <label className="block text-xs text-muted mb-1.5" htmlFor="webhook-url">
                Incoming Webhook URL
              </label>
              <input
                id="webhook-url"
                type="url"
                value={webhookUrl}
                onChange={(e) => setWebhookUrl(e.target.value)}
                placeholder="https://hooks.slack.com/services/..."
                className="w-full px-3 py-2 text-sm bg-surface border border-border rounded-md text-primary placeholder:text-muted focus:outline-none focus:border-accent/50 font-mono"
              />
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="primary"
                size="sm"
                onClick={handleSave}
                disabled={saving || !webhookUrl.trim()}
              >
                {saving ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Saving…
                  </>
                ) : (
                  'Save webhook'
                )}
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={handleTest}
                disabled={testing || !webhookUrl.trim()}
              >
                {testing ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Sending…
                  </>
                ) : (
                  'Send test'
                )}
              </Button>
            </div>

            {status && <StatusMessage type={status.type} text={status.text} />}

            <p className="text-xs text-muted">
              Create a webhook in your Slack workspace: Apps → Incoming Webhooks
            </p>
          </div>
        </Card>

        {/* ── Section 3: Team Members ── */}
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <Users className="w-4 h-4 text-muted" />
            <h2 className="font-display font-semibold text-lg text-primary">
              Team Members
              <span className="ml-2 text-muted text-sm font-normal">({users.length})</span>
            </h2>
          </div>

          {users.length === 0 ? (
            <p className="text-sm text-muted text-center py-6">No team members found.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-2 pr-4 text-xs font-semibold text-muted uppercase tracking-wide">Name</th>
                    <th className="text-left py-2 pr-4 text-xs font-semibold text-muted uppercase tracking-wide">Email</th>
                    <th className="text-left py-2 pr-4 text-xs font-semibold text-muted uppercase tracking-wide">Role</th>
                    <th className="text-left py-2 text-xs font-semibold text-muted uppercase tracking-wide">Joined</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id} className="border-t border-border hover:bg-elevated transition-colors">
                      <td className="py-2.5 pr-4 font-medium text-primary">{u.name}</td>
                      <td className="py-2.5 pr-4 text-secondary font-mono text-xs">{u.email}</td>
                      <td className="py-2.5 pr-4">
                        <Badge variant={roleBadgeVariant(u.role)} size="sm">
                          {u.role.charAt(0).toUpperCase() + u.role.slice(1)}
                        </Badge>
                      </td>
                      <td className="py-2.5 text-muted text-xs">{formatDate(u.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

      </div>
    </div>
  );
}
