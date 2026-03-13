/**
 * Sync Engine — shared logic for all data sources.
 *
 * Any integration (Google, CSV, Plaid) produces normalized records and
 * passes them here. This module handles the DB upserts, deduplication,
 * utilization scoring, and alert generation — so each connector stays thin.
 */

import { db } from "@/lib/db";

// ─── Normalized input types ────────────────────────────────────────────────

export interface DiscoveredEmployee {
  email:      string;
  name:       string;
  department?: string;
  jobTitle?:   string;
  externalId?: string;
  status?:     "active" | "offboarded";
}

export interface DiscoveredApp {
  name:         string;
  category?:    string;
  monthlySpend?: number;
  totalSeats?:   number;
  source:       string; // "google_workspace" | "bank_feed" | "csv" | etc.
}

export interface DiscoveredAccess {
  employeeEmail: string;
  appName:       string;
  lastLoginAt?:  Date;
  loginCount?:   number;
  isActive?:     boolean;
}

export interface DiscoveredSpend {
  appName?:     string;
  amount:       number;
  date:         Date;
  description:  string;
  source:       string;
  isRecurring?: boolean;
}

export interface SyncResult {
  employees: { upserted: number };
  apps:      { upserted: number; discovered: number };
  access:    { upserted: number };
  spend:     { created: number };
  alerts:    { created: number };
}

// ─── Main sync function ───────────────────────────────────────────────────

export async function runSync(
  orgId: string,
  data: {
    employees?: DiscoveredEmployee[];
    apps?:      DiscoveredApp[];
    access?:    DiscoveredAccess[];
    spend?:     DiscoveredSpend[];
  }
): Promise<SyncResult> {
  const result: SyncResult = {
    employees: { upserted: 0 },
    apps:      { upserted: 0, discovered: 0 },
    access:    { upserted: 0 },
    spend:     { created: 0 },
    alerts:    { created: 0 },
  };

  // ── 1. Employees ─────────────────────────────────────────────────────────
  for (const emp of data.employees ?? []) {
    await db.employee.upsert({
      where:  { orgId_email: { orgId, email: emp.email.toLowerCase() } },
      update: {
        name:       emp.name,
        department: emp.department,
        jobTitle:   emp.jobTitle,
        externalId: emp.externalId,
        status:     emp.status ?? "active",
      },
      create: {
        orgId,
        email:      emp.email.toLowerCase(),
        name:       emp.name,
        department: emp.department,
        jobTitle:   emp.jobTitle,
        externalId: emp.externalId,
        status:     emp.status ?? "active",
      },
    });
    result.employees.upserted++;
  }

  // ── 2. Apps ───────────────────────────────────────────────────────────────
  for (const app of data.apps ?? []) {
    const existing = await db.saasApp.findUnique({
      where: { orgId_name: { orgId, name: app.name } },
    });

    if (existing) {
      await db.saasApp.update({
        where: { id: existing.id },
        data: {
          category:      app.category      ?? existing.category,
          monthlySpend:  app.monthlySpend  ?? existing.monthlySpend,
          totalSeats:    app.totalSeats    ?? existing.totalSeats,
          source:        app.source,
          lastDetectedAt: new Date(),
        },
      });
      result.apps.upserted++;
    } else {
      await db.saasApp.create({
        data: {
          orgId,
          name:         app.name,
          category:     app.category ?? "other",
          monthlySpend: app.monthlySpend  ?? 0,
          annualSpend:  (app.monthlySpend ?? 0) * 12,
          totalSeats:   app.totalSeats ?? 0,
          source:       app.source,
          status:       "active",
          lastDetectedAt: new Date(),
        },
      });
      result.apps.discovered++;
    }
  }

  // ── 3. App Access ─────────────────────────────────────────────────────────
  for (const access of data.access ?? []) {
    const employee = await db.employee.findUnique({
      where: { orgId_email: { orgId, email: access.employeeEmail.toLowerCase() } },
    });
    const appRec = await db.saasApp.findUnique({
      where: { orgId_name: { orgId, name: access.appName } },
    });

    if (!employee || !appRec) continue;

    await db.appAccess.upsert({
      where:  { employeeId_appId: { employeeId: employee.id, appId: appRec.id } },
      update: {
        lastLoginAt: access.lastLoginAt,
        loginCount:  access.loginCount ?? 0,
        isActive:    access.isActive   ?? true,
      },
      create: {
        employeeId:  employee.id,
        appId:       appRec.id,
        lastLoginAt: access.lastLoginAt,
        loginCount:  access.loginCount ?? 0,
        isActive:    access.isActive   ?? true,
      },
    });
    result.access.upserted++;
  }

  // ── 4. Spend Records ──────────────────────────────────────────────────────
  for (const spend of data.spend ?? []) {
    let appId: string | undefined;
    if (spend.appName) {
      const appRec = await db.saasApp.findUnique({
        where: { orgId_name: { orgId, name: spend.appName } },
      });
      appId = appRec?.id;
    }

    await db.spendRecord.create({
      data: {
        orgId,
        appId:       appId ?? null,
        amount:      spend.amount,
        date:        spend.date,
        description: spend.description,
        source:      spend.source,
        isRecurring: spend.isRecurring ?? false,
      },
    });
    result.spend.created++;
  }

  // ── 5. Post-sync: refresh active seat counts & generate alerts ────────────
  await refreshUtilization(orgId);
  result.alerts.created = await generateAlerts(orgId);

  return result;
}

// ─── Utilization refresh ─────────────────────────────────────────────────────

async function refreshUtilization(orgId: string) {
  const apps = await db.saasApp.findMany({ where: { orgId } });

  for (const app of apps) {
    const activeCount = await db.appAccess.count({
      where: { appId: app.id, isActive: true },
    });
    const totalCount = await db.appAccess.count({
      where: { appId: app.id },
    });

    // If access records exist, use them; else keep existing values
    if (totalCount > 0) {
      const utilPct = (activeCount / totalCount) * 100;
      await db.saasApp.update({
        where: { id: app.id },
        data: {
          activeSeats: activeCount,
          totalSeats:  totalCount,
          status: utilPct < 30 ? "zombie" : "active",
        },
      });
    }
  }
}

// ─── Alert generation ─────────────────────────────────────────────────────────

async function generateAlerts(orgId: string): Promise<number> {
  let count = 0;

  // Clear stale auto-generated alerts first
  await db.alert.deleteMany({
    where: { orgId, isDismissed: false, type: { in: ["zombie_app", "redundancy", "unused_seats"] } },
  });

  const apps = await db.saasApp.findMany({ where: { orgId } });

  for (const app of apps) {
    // Zombie app alert
    if (app.totalSeats > 0 && app.status === "zombie") {
      const unusedSeats = app.totalSeats - app.activeSeats;
      const potentialSaving = Math.round((unusedSeats / app.totalSeats) * app.monthlySpend);
      await db.alert.create({
        data: {
          orgId,
          appId:    app.id,
          type:     "zombie_app",
          severity: "critical",
          title:    `${app.name}: ${Math.round((unusedSeats / app.totalSeats) * 100)}% seats unused`,
          body:     `${unusedSeats} of ${app.totalSeats} seats idle. Potential savings: $${potentialSaving}/mo.`,
        },
      });
      count++;
    }

    // Unused seats (warning tier: 40-69% unused)
    if (app.totalSeats > 0) {
      const util = app.activeSeats / app.totalSeats;
      if (util >= 0.30 && util < 0.60) {
        const unusedSeats = app.totalSeats - app.activeSeats;
        await db.alert.create({
          data: {
            orgId,
            appId:    app.id,
            type:     "unused_seats",
            severity: "warning",
            title:    `${app.name}: ${unusedSeats} seats not in use`,
            body:     `Only ${Math.round(util * 100)}% utilization. Consider right-sizing to save ~$${Math.round((1 - util) * app.monthlySpend * 0.8)}/mo.`,
          },
        });
        count++;
      }
    }
  }

  // Redundancy check: multiple apps in same category
  const byCategory: Record<string, typeof apps> = {};
  for (const app of apps) {
    if (!byCategory[app.category]) byCategory[app.category] = [];
    byCategory[app.category].push(app);
  }

  for (const [cat, catApps] of Object.entries(byCategory)) {
    if (catApps.length >= 3 && cat !== "other") {
      const totalSpend = catApps.reduce((s, a) => s + a.monthlySpend, 0);
      const names = catApps.map((a) => a.name).join(", ");
      await db.alert.create({
        data: {
          orgId,
          type:     "redundancy",
          severity: "warning",
          title:    `${catApps.length} overlapping ${cat} tools`,
          body:     `${names} all serve similar functions. Consolidating could save up to $${Math.round(totalSpend * 0.4).toLocaleString()}/mo.`,
        },
      });
      count++;
    }
  }

  return count;
}
