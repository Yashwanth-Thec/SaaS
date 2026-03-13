/**
 * Offboarding Engine
 *
 * Given an employee and their app access, generates a structured
 * checklist of steps to fully remove them from the company's SaaS stack.
 *
 * Step types:
 *  - revoke_access:       Remove the seat from the app (manual or via API)
 *  - cancel_subscription: Downgrade if they were the only user on a paid plan
 *  - transfer_data:       Export/transfer their data before revoking (e.g. Notion, Drive)
 *  - notify_vendor:       Email vendor to confirm removal and stop billing
 */

import { randomUUID } from "crypto";

export interface OffboardingStep {
  id:           string;
  appId:        string;
  appName:      string;
  category:     string;
  type:         "revoke_access" | "cancel_subscription" | "transfer_data" | "notify_vendor";
  status:       "pending" | "done" | "skipped" | "failed";
  priority:     "high" | "medium" | "low";
  monthlySpend: number; // monthly cost freed when this seat is revoked
  notes:        string;
  completedAt:  string | null;
  draftEmail:   string | null;
}

// Apps where data transfer is important before revoking
const DATA_TRANSFER_APPS = new Set([
  "google workspace", "notion", "confluence", "dropbox", "box",
  "github", "gitlab", "figma", "miro", "airtable",
]);

// Apps that are billed per-seat where removal saves money
const PER_SEAT_APPS = new Set([
  "slack", "zoom", "notion", "figma", "jira", "asana",
  "monday.com", "clickup", "linear", "hubspot", "salesforce",
  "datadog", "1password", "okta",
]);

// High-priority apps (security/finance/admin access)
const HIGH_PRIORITY_APPS = new Set([
  "okta", "1password", "lastpass", "aws", "google workspace",
  "salesforce", "hubspot", "quickbooks", "stripe", "github",
  "gitlab", "datadog", "pagerduty",
]);

export interface AppAccess {
  appId:        string;
  appName:      string;
  category:     string;
  monthlySpend: number;
  totalSeats:   number;
}

export function generateOffboardingSteps(
  employee: { name: string; email: string },
  appAccess: AppAccess[]
): OffboardingStep[] {
  const steps: OffboardingStep[] = [];

  // Sort: high-priority apps first
  const sorted = [...appAccess].sort((a, b) => {
    const aHigh = HIGH_PRIORITY_APPS.has(a.appName.toLowerCase());
    const bHigh = HIGH_PRIORITY_APPS.has(b.appName.toLowerCase());
    return bHigh ? 1 : aHigh ? -1 : 0;
  });

  for (const app of sorted) {
    const nameLower = app.appName.toLowerCase();
    const isHighPriority = HIGH_PRIORITY_APPS.has(nameLower);
    const isPerSeat      = PER_SEAT_APPS.has(nameLower);
    const needsTransfer  = DATA_TRANSFER_APPS.has(nameLower);

    // 1. Data transfer step (before revocation)
    if (needsTransfer) {
      steps.push({
        id:           randomUUID(),
        appId:        app.appId,
        appName:      app.appName,
        category:     app.category,
        type:         "transfer_data",
        status:       "pending",
        priority:     "medium",
        monthlySpend: 0,
        notes:        `Export ${employee.name}'s data from ${app.appName} before revoking access.`,
        completedAt:  null,
        draftEmail:   null,
      });
    }

    // 2. Revoke access (always)
    const perSeatSaving = isPerSeat && app.totalSeats > 0
      ? Math.round(app.monthlySpend / app.totalSeats)
      : 0;

    steps.push({
      id:           randomUUID(),
      appId:        app.appId,
      appName:      app.appName,
      category:     app.category,
      type:         "revoke_access",
      status:       "pending",
      priority:     isHighPriority ? "high" : "medium",
      monthlySpend: perSeatSaving,
      notes:        `Remove ${employee.email} from ${app.appName}.${
        isHighPriority ? " ⚠ High priority — security/finance access." : ""
      }`,
      completedAt:  null,
      draftEmail:   buildRevokeEmail(employee, app.appName),
    });
  }

  // 3. Final vendor notification (one composite step)
  if (appAccess.length > 0) {
    steps.push({
      id:           randomUUID(),
      appId:        "",
      appName:      "All Vendors",
      category:     "other",
      type:         "notify_vendor",
      status:       "pending",
      priority:     "low",
      monthlySpend: 0,
      notes:        "Confirm with IT that all access has been revoked and no pending invoices exist.",
      completedAt:  null,
      draftEmail:   buildFinalNotificationEmail(employee, appAccess.map((a) => a.appName)),
    });
  }

  return steps;
}

// ─── Email draft builders ─────────────────────────────────────────────────────

function buildRevokeEmail(
  employee: { name: string; email: string },
  appName: string
): string {
  return `Subject: User Removal Request — ${employee.name} (${employee.email})

Hi ${appName} Support,

We are writing to request the immediate removal of the following user from our ${appName} account:

  Name:  ${employee.name}
  Email: ${employee.email}

This employee has left our organization and their account should be deactivated and their seat released immediately.

Please confirm removal and advise if any pending charges will be prorated.

Thank you,
[Your Name]
IT / Finance Team`.trim();
}

function buildFinalNotificationEmail(
  employee: { name: string; email: string },
  apps: string[]
): string {
  return `Subject: Employee Offboarding Complete — ${employee.name}

Hi Team,

This is to confirm that the offboarding of ${employee.name} (${employee.email}) is complete.

Access has been revoked from the following systems:
${apps.map((a) => `  • ${a}`).join("\n")}

Please review your billing statements in 30 days to confirm no charges remain for this user.

If you notice any continued billing, escalate to the finance team immediately.

— SaaS-Scrub Offboarding`.trim();
}

// ─── Progress calculation ─────────────────────────────────────────────────────

export function calcProgress(steps: OffboardingStep[]): {
  done:     number;
  total:    number;
  pct:      number;
  savings:  number;
  isComplete: boolean;
} {
  const done    = steps.filter((s) => s.status === "done" || s.status === "skipped").length;
  const total   = steps.length;
  const pct     = total > 0 ? Math.round((done / total) * 100) : 0;
  const savings = steps
    .filter((s) => s.status === "done" && s.type === "revoke_access")
    .reduce((sum, s) => sum + s.monthlySpend, 0);

  return { done, total, pct, savings, isComplete: done === total && total > 0 };
}
