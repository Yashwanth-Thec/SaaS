/**
 * Microsoft Entra ID (Azure AD) Integration
 *
 * Provides two capabilities:
 * 1. SSO: sign in with a Microsoft account (delegated, User.Read scope)
 * 2. Data integration: discover M365 users, enterprise apps, and sign-in activity
 *    via Microsoft Graph API (application permissions, admin consent required)
 *
 * Single app registration — requires two redirect URIs:
 *   https://<your-domain>/api/auth/microsoft/callback       (SSO)
 *   https://<your-domain>/api/integrations/microsoft/callback (data)
 */

import { db } from "@/lib/db";
import { guessCategory } from "./categories";
import type { DiscoveredEmployee, DiscoveredApp, DiscoveredAccess } from "./sync-engine";

const GRAPH_BASE = "https://graph.microsoft.com/v1.0";

function getTenant() {
  return process.env.MICROSOFT_TENANT_ID ?? "common";
}
function getTokenUrl() {
  return `https://login.microsoftonline.com/${getTenant()}/oauth2/v2.0/token`;
}
function getAuthBaseUrl() {
  return `https://login.microsoftonline.com/${getTenant()}/oauth2/v2.0/authorize`;
}
function getBaseUrl() {
  return process.env.NEXT_PUBLIC_URL ?? "http://localhost:3000";
}

// ─── Scopes ────────────────────────────────────────────────────────────────────

// SSO: minimal delegated scopes for user identity
const SSO_SCOPES = ["openid", "profile", "email", "User.Read"];

// Data integration: application-level scopes (admin consent required)
const DATA_SCOPES = [
  "https://graph.microsoft.com/User.Read.All",
  "https://graph.microsoft.com/Directory.Read.All",
  "https://graph.microsoft.com/AuditLog.Read.All",
  "offline_access",
];

// ─── Auth URL builders ─────────────────────────────────────────────────────────

export function buildMicrosoftSSOUrl(nonce: string): string {
  const params = new URLSearchParams({
    client_id:     process.env.MICROSOFT_CLIENT_ID!,
    response_type: "code",
    redirect_uri:  `${getBaseUrl()}/api/auth/microsoft/callback`,
    scope:         SSO_SCOPES.join(" "),
    response_mode: "query",
    state:         nonce,
  });
  return `${getAuthBaseUrl()}?${params}`;
}

export function buildMicrosoftDataAuthUrl(orgId: string): string {
  const params = new URLSearchParams({
    client_id:     process.env.MICROSOFT_CLIENT_ID!,
    response_type: "code",
    redirect_uri:  `${getBaseUrl()}/api/integrations/microsoft/callback`,
    scope:         DATA_SCOPES.join(" "),
    response_mode: "query",
    state:         orgId,
    prompt:        "consent", // force admin consent screen every time
  });
  return `${getAuthBaseUrl()}?${params}`;
}

// ─── Token exchange ────────────────────────────────────────────────────────────

async function exchangeCode(
  code: string,
  redirectUri: string,
  scopes: string[]
): Promise<{ access_token: string; refresh_token?: string; expires_in: number }> {
  const body = new URLSearchParams({
    client_id:     process.env.MICROSOFT_CLIENT_ID!,
    client_secret: process.env.MICROSOFT_CLIENT_SECRET!,
    grant_type:    "authorization_code",
    code,
    redirect_uri:  redirectUri,
    scope:         scopes.join(" "),
  });

  const res = await fetch(getTokenUrl(), {
    method:  "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body:    body.toString(),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Microsoft token exchange failed: ${err}`);
  }

  return res.json();
}

export async function exchangeMicrosoftSSOCode(code: string) {
  return exchangeCode(
    code,
    `${getBaseUrl()}/api/auth/microsoft/callback`,
    SSO_SCOPES
  );
}

export async function exchangeMicrosoftDataCode(code: string): Promise<{
  access_token:  string;
  refresh_token: string;
  expires_in:    number;
}> {
  const tokens = await exchangeCode(
    code,
    `${getBaseUrl()}/api/integrations/microsoft/callback`,
    DATA_SCOPES
  );
  if (!tokens.refresh_token) {
    throw new Error("No refresh token — ensure offline_access scope and prompt=consent");
  }
  return tokens as { access_token: string; refresh_token: string; expires_in: number };
}

// ─── Stored token helpers ──────────────────────────────────────────────────────

export interface StoredTokens {
  access_token:  string;
  refresh_token: string;
  expires_at:    number; // unix ms
}

export function buildStoredTokens(tokens: {
  access_token:  string;
  refresh_token: string;
  expires_in:    number;
}): StoredTokens {
  return {
    access_token:  tokens.access_token,
    refresh_token: tokens.refresh_token,
    expires_at:    Date.now() + tokens.expires_in * 1000,
  };
}

// ─── Token refresh ─────────────────────────────────────────────────────────────

async function refreshAccessToken(refreshToken: string): Promise<{
  access_token: string;
  expires_in:   number;
}> {
  const body = new URLSearchParams({
    client_id:     process.env.MICROSOFT_CLIENT_ID!,
    client_secret: process.env.MICROSOFT_CLIENT_SECRET!,
    grant_type:    "refresh_token",
    refresh_token: refreshToken,
    scope:         DATA_SCOPES.join(" "),
  });

  const res = await fetch(getTokenUrl(), {
    method:  "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body:    body.toString(),
  });

  if (!res.ok) throw new Error("Failed to refresh Microsoft token");
  return res.json();
}

// ─── Graph API: get current user profile (SSO) ────────────────────────────────

export async function getMicrosoftProfile(accessToken: string): Promise<{
  id:                string;
  displayName:       string;
  mail:              string | null;
  userPrincipalName: string;
}> {
  const res = await fetch(
    `${GRAPH_BASE}/me?$select=id,displayName,mail,userPrincipalName`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  if (!res.ok) throw new Error("Failed to fetch Microsoft profile");
  return res.json();
}

// ─── Graph API: paginated GET ──────────────────────────────────────────────────

async function graphGetAll<T>(accessToken: string, path: string): Promise<T[]> {
  const items: T[] = [];
  let url: string | null = `${GRAPH_BASE}${path}`;

  while (url) {
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Graph API ${res.status}: ${err}`);
    }
    const data = (await res.json()) as { value: T[]; "@odata.nextLink"?: string };
    items.push(...(data.value ?? []));
    url = data["@odata.nextLink"] ?? null;
  }

  return items;
}

// ─── Get access token from DB (with auto-refresh) ─────────────────────────────

async function getAccessToken(orgId: string): Promise<string> {
  const integration = await db.integration.findUnique({
    where: { orgId_type: { orgId, type: "azure_ad" } },
  });
  if (!integration?.config) throw new Error("Microsoft Entra ID not connected");

  const stored = JSON.parse(integration.config) as StoredTokens;

  // Refresh 5 min before expiry
  if (Date.now() > stored.expires_at - 5 * 60 * 1000) {
    const refreshed = await refreshAccessToken(stored.refresh_token);
    const updated: StoredTokens = {
      access_token:  refreshed.access_token,
      refresh_token: stored.refresh_token,
      expires_at:    Date.now() + refreshed.expires_in * 1000,
    };
    await db.integration.update({
      where: { id: integration.id },
      data:  { config: JSON.stringify(updated) },
    });
    return updated.access_token;
  }

  return stored.access_token;
}

// ─── Sync: Users ───────────────────────────────────────────────────────────────

interface GraphUser {
  id:                string;
  displayName:       string;
  mail:              string | null;
  userPrincipalName: string;
  jobTitle:          string | null;
  department:        string | null;
  accountEnabled:    boolean;
}

async function fetchUsers(accessToken: string): Promise<DiscoveredEmployee[]> {
  const users = await graphGetAll<GraphUser>(
    accessToken,
    "/users?$select=id,displayName,mail,userPrincipalName,jobTitle,department,accountEnabled&$top=999"
  );

  return users
    .filter((u) => u.mail || u.userPrincipalName)
    .map((u) => ({
      email:      (u.mail ?? u.userPrincipalName).toLowerCase(),
      name:       u.displayName,
      jobTitle:   u.jobTitle ?? undefined,
      department: u.department ?? undefined,
      externalId: u.id,
      status:     u.accountEnabled ? "active" : "offboarded",
    }));
}

// ─── Sync: Enterprise Apps (service principals) ────────────────────────────────

interface GraphServicePrincipal {
  id:          string;
  displayName: string;
  appId:       string;
  tags:        string[];
}

async function fetchApps(accessToken: string): Promise<DiscoveredApp[]> {
  try {
    const sps = await graphGetAll<GraphServicePrincipal>(
      accessToken,
      "/servicePrincipals?$select=id,displayName,appId,tags&$top=999"
    );

    // Only surface non-Microsoft apps that have been integrated by the tenant admin
    return sps
      .filter((sp) =>
        sp.tags?.includes("WindowsAzureActiveDirectoryIntegratedApp")
      )
      .filter(
        (sp) =>
          !sp.displayName.startsWith("Microsoft ") &&
          !sp.displayName.startsWith("Windows ") &&
          !sp.displayName.startsWith("Azure ")
      )
      .map((sp) => ({
        name:     sp.displayName,
        category: guessCategory(sp.displayName),
        source:   "azure_ad",
      }));
  } catch (err) {
    console.warn("[microsoft] Could not fetch service principals:", err);
    return [];
  }
}

// ─── Sync: Sign-in Activity ────────────────────────────────────────────────────

interface GraphSignIn {
  userPrincipalName:   string;
  resourceDisplayName: string;
  createdDateTime:     string;
  status:              { errorCode: number };
}

async function fetchSignIns(accessToken: string): Promise<DiscoveredAccess[]> {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const signIns = await graphGetAll<GraphSignIn>(
      accessToken,
      `/auditLogs/signIns?$select=userPrincipalName,resourceDisplayName,createdDateTime,status` +
        `&$filter=createdDateTime ge ${thirtyDaysAgo.toISOString()}&$top=1000`
    );

    return signIns
      .filter((s) => s.status?.errorCode === 0) // successful sign-ins only
      .map((s) => ({
        employeeEmail: s.userPrincipalName.toLowerCase(),
        appName:       s.resourceDisplayName,
        lastLoginAt:   new Date(s.createdDateTime),
        isActive:      true,
      }));
  } catch (err) {
    console.warn(
      "[microsoft] Sign-in logs unavailable (requires AuditLog.Read.All admin consent):",
      err
    );
    return [];
  }
}

// ─── Full data sync ────────────────────────────────────────────────────────────

export async function syncMicrosoftEntraID(orgId: string) {
  const accessToken = await getAccessToken(orgId);

  const [employees, apps, access] = await Promise.all([
    fetchUsers(accessToken),
    fetchApps(accessToken),
    fetchSignIns(accessToken),
  ]);

  return { employees, apps, access };
}

// ─── Config check ──────────────────────────────────────────────────────────────

export function isMicrosoftConfigured(): boolean {
  return !!(process.env.MICROSOFT_CLIENT_ID && process.env.MICROSOFT_CLIENT_SECRET);
}
