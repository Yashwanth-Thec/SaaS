/**
 * Google Workspace Integration
 *
 * Uses OAuth2 + Google Admin SDK to discover:
 *   - All users in the org (→ Employees)
 *   - OAuth apps employees have authorized (→ SaasApps)
 *   - Login activity per app (→ AppAccess)
 *
 * Requires Google Cloud project with:
 *   - Admin SDK API enabled
 *   - OAuth consent screen configured (internal)
 *   - Scopes: admin.directory.user.readonly, admin.reports.audit.readonly
 */

import { google } from "googleapis";
import { db } from "@/lib/db";
import { guessCategory } from "./categories";
import type { DiscoveredEmployee, DiscoveredApp, DiscoveredAccess } from "./sync-engine";

const SCOPES = [
  "https://www.googleapis.com/auth/admin.directory.user.readonly",
  "https://www.googleapis.com/auth/admin.reports.audit.readonly",
  "https://www.googleapis.com/auth/admin.directory.domain.readonly",
];

// ─── OAuth2 Client ────────────────────────────────────────────────────────────

function createOAuthClient() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    `${process.env.NEXT_PUBLIC_URL ?? "http://localhost:3000"}/api/integrations/google/callback`
  );
}

// ─── Auth URL ─────────────────────────────────────────────────────────────────

export function buildGoogleAuthUrl(orgId: string): string {
  const client = createOAuthClient();
  return client.generateAuthUrl({
    access_type: "offline",
    prompt:      "consent",   // force refresh_token every time
    scope:       SCOPES,
    state:       orgId,       // passed back in callback so we know which org
  });
}

// ─── Token exchange ───────────────────────────────────────────────────────────

export async function exchangeGoogleCode(code: string): Promise<{
  access_token:  string;
  refresh_token: string;
  expiry_date:   number;
}> {
  const client = createOAuthClient();
  const { tokens } = await client.getToken(code);

  if (!tokens.access_token || !tokens.refresh_token) {
    throw new Error("Missing tokens from Google — ensure offline access and prompt=consent");
  }

  return {
    access_token:  tokens.access_token,
    refresh_token: tokens.refresh_token,
    expiry_date:   tokens.expiry_date ?? Date.now() + 3600 * 1000,
  };
}

// ─── Authenticated client from stored tokens ──────────────────────────────────

async function getAuthenticatedClient(orgId: string) {
  const integration = await db.integration.findUnique({
    where: { orgId_type: { orgId, type: "google_workspace" } },
  });
  if (!integration?.config) throw new Error("Google Workspace not connected");

  const config = JSON.parse(integration.config) as {
    access_token: string;
    refresh_token: string;
    expiry_date: number;
  };

  const client = createOAuthClient();
  client.setCredentials(config);

  // Refresh token automatically if expired
  client.on("tokens", async (tokens) => {
    if (tokens.access_token) {
      const updated = { ...config, ...tokens };
      await db.integration.update({
        where: { id: integration.id },
        data:  { config: JSON.stringify(updated) },
      });
    }
  });

  return client;
}

// ─── Sync: Users ──────────────────────────────────────────────────────────────

async function fetchUsers(auth: ReturnType<typeof createOAuthClient>): Promise<DiscoveredEmployee[]> {
  const admin = google.admin({ version: "directory_v1", auth });
  const employees: DiscoveredEmployee[] = [];
  let pageToken: string | undefined;

  do {
    const res = await admin.users.list({
      customer:   "my_customer",
      maxResults: 200,
      pageToken,
      projection: "full",
    });

    for (const user of res.data.users ?? []) {
      if (!user.primaryEmail) continue;
      employees.push({
        email:      user.primaryEmail,
        name:       user.name?.fullName ?? user.primaryEmail,
        department: user.organizations?.[0]?.department ?? undefined,
        jobTitle:   user.organizations?.[0]?.title ?? undefined,
        externalId: user.id ?? undefined,
        status:     user.suspended ? "offboarded" : "active",
      });
    }

    pageToken = res.data.nextPageToken ?? undefined;
  } while (pageToken);

  return employees;
}

// ─── Sync: OAuth Apps from Reports ────────────────────────────────────────────

async function fetchOAuthApps(auth: ReturnType<typeof createOAuthClient>): Promise<{
  apps: DiscoveredApp[];
  access: DiscoveredAccess[];
}> {
  const admin = google.admin({ version: "reports_v1", auth });
  const appMap = new Map<string, DiscoveredApp>();
  const accessRecords: DiscoveredAccess[] = [];

  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const res = await admin.activities.list({
      userKey:         "all",
      applicationName: "token",
      startTime:       thirtyDaysAgo.toISOString(),
      maxResults:      1000,
    });

    for (const activity of res.data.items ?? []) {
      const email   = activity.actor?.email;
      const appName = activity.events?.[0]?.parameters?.find((p) => p.name === "app_name")?.value;

      if (!email || !appName) continue;

      // Add to app map
      if (!appMap.has(appName)) {
        appMap.set(appName, {
          name:     appName,
          category: guessCategory(appName),
          source:   "google_workspace",
        });
      }

      accessRecords.push({
        employeeEmail: email,
        appName,
        lastLoginAt:   activity.id?.time ? new Date(activity.id.time) : undefined,
        isActive:      true,
      });
    }
  } catch (err) {
    // Reports API may not be available on all editions
    console.warn("[google] Reports API unavailable:", err);
  }

  return { apps: Array.from(appMap.values()), access: accessRecords };
}

// ─── Full sync ────────────────────────────────────────────────────────────────

export async function syncGoogleWorkspace(orgId: string) {
  const auth = await getAuthenticatedClient(orgId);

  const [employees, { apps, access }] = await Promise.all([
    fetchUsers(auth),
    fetchOAuthApps(auth),
  ]);

  return { employees, apps, access };
}

// guessCategory re-exported for convenience (imported from categories.ts)
export { guessCategory } from "./categories";

// ─── Credential check ─────────────────────────────────────────────────────────

export function isGoogleConfigured(): boolean {
  return !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}
