/**
 * Plaid Integration
 *
 * Uses Plaid Link to connect a corporate bank account or credit card,
 * then syncs transactions to detect SaaS spend and shadow IT.
 *
 * Flow:
 *   1. POST /api/integrations/plaid/link     → returns link_token for frontend
 *   2. Frontend opens Plaid Link modal        → user selects their bank
 *   3. POST /api/integrations/plaid/exchange  → exchanges public_token for access_token
 *   4. POST /api/integrations/plaid/sync      → pulls 90 days of transactions
 *
 * Sandbox test credentials:
 *   Username: user_good  Password: pass_good
 */

import { Configuration, PlaidApi, PlaidEnvironments, Products, CountryCode } from "plaid";
import type { DiscoveredApp, DiscoveredSpend } from "./sync-engine";

// ─── Client ───────────────────────────────────────────────────────────────────

function createPlaidClient(): PlaidApi {
  const env = (process.env.PLAID_ENV ?? "sandbox") as keyof typeof PlaidEnvironments;
  const config = new Configuration({
    basePath:     PlaidEnvironments[env],
    baseOptions: {
      headers: {
        "PLAID-CLIENT-ID": process.env.PLAID_CLIENT_ID ?? "",
        "PLAID-SECRET":    process.env.PLAID_SECRET ?? "",
      },
    },
  });
  return new PlaidApi(config);
}

// ─── Known SaaS patterns ──────────────────────────────────────────────────────

const SAAS_PATTERNS: { pattern: RegExp; name: string; category: string; approxMonthly?: number }[] = [
  { pattern: /slack\s*technologies/i,    name: "Slack",         category: "communication" },
  { pattern: /zoom\s*video/i,            name: "Zoom",          category: "communication" },
  { pattern: /microsoft\s*(365|corp)/i,  name: "Microsoft 365", category: "productivity"  },
  { pattern: /google\s*(workspace|llc)/i,name: "Google Workspace",category: "productivity"},
  { pattern: /notion\s*labs/i,           name: "Notion",        category: "productivity"  },
  { pattern: /asana/i,                   name: "Asana",         category: "productivity"  },
  { pattern: /atlassian/i,               name: "Jira",          category: "dev"           },
  { pattern: /github/i,                  name: "GitHub",        category: "dev"           },
  { pattern: /figma/i,                   name: "Figma",         category: "design"        },
  { pattern: /salesforce/i,              name: "Salesforce",    category: "finance"       },
  { pattern: /hubspot/i,                 name: "HubSpot",       category: "finance"       },
  { pattern: /datadog/i,                 name: "Datadog",       category: "analytics"     },
  { pattern: /okta/i,                    name: "Okta",          category: "security"      },
  { pattern: /1password/i,               name: "1Password",     category: "security"      },
  { pattern: /adobe\s*(systems|inc)/i,   name: "Adobe CC",      category: "design"        },
  { pattern: /dropbox/i,                 name: "Dropbox",       category: "productivity"  },
  { pattern: /intercom/i,                name: "Intercom",      category: "communication" },
  { pattern: /monday\.com/i,             name: "Monday.com",    category: "productivity"  },
  { pattern: /clickup/i,                 name: "ClickUp",       category: "productivity"  },
  { pattern: /linear/i,                  name: "Linear",        category: "dev"           },
  { pattern: /loom/i,                    name: "Loom",          category: "communication" },
  { pattern: /mixpanel/i,                name: "Mixpanel",      category: "analytics"     },
  { pattern: /stripe/i,                  name: "Stripe",        category: "finance"       },
  { pattern: /twilio/i,                  name: "Twilio",        category: "dev"           },
  { pattern: /zendesk/i,                 name: "Zendesk",       category: "communication" },
  { pattern: /box\.com|box\s*inc/i,      name: "Box",           category: "productivity"  },
  { pattern: /miro/i,                    name: "Miro",          category: "design"        },
];

function matchSaasVendor(description: string) {
  return SAAS_PATTERNS.find((p) => p.pattern.test(description)) ?? null;
}

// ─── Create Link Token ────────────────────────────────────────────────────────

export async function createLinkToken(userId: string): Promise<string> {
  const client = createPlaidClient();
  const res = await client.linkTokenCreate({
    user:          { client_user_id: userId },
    client_name:   "SaaS-Scrub",
    products:      [Products.Transactions],
    country_codes: [CountryCode.Us],
    language:      "en",
  });
  return res.data.link_token;
}

// ─── Exchange Public Token ────────────────────────────────────────────────────

export async function exchangePublicToken(publicToken: string): Promise<{
  access_token: string;
  item_id:      string;
}> {
  const client = createPlaidClient();
  const res = await client.itemPublicTokenExchange({ public_token: publicToken });
  return {
    access_token: res.data.access_token,
    item_id:      res.data.item_id,
  };
}

// ─── Sync Transactions → Spend Records ───────────────────────────────────────

export interface PlaidSyncResult {
  apps:  DiscoveredApp[];
  spend: DiscoveredSpend[];
  shadowItCount: number;
}

export async function syncPlaidTransactions(accessToken: string): Promise<PlaidSyncResult> {
  const client = createPlaidClient();
  const apps:  DiscoveredApp[]  = [];
  const spend: DiscoveredSpend[] = [];
  const discoveredVendors = new Set<string>();
  let shadowItCount = 0;

  const start = new Date();
  start.setDate(start.getDate() - 90); // 90 days lookback
  const end   = new Date();

  // Paginate all transactions
  let cursor: string | undefined;

  // Use transactions/sync for incremental sync (preferred over /get)
  const syncRes = await client.transactionsSync({
    access_token: accessToken,
    cursor,
    count: 500,
  });

  const transactions = [
    ...syncRes.data.added,
    ...syncRes.data.modified,
  ];

  for (const txn of transactions) {
    // Skip income, refunds, and internal transfers
    if (txn.amount <= 0) continue;

    const vendor = matchSaasVendor(txn.merchant_name ?? txn.name ?? "");

    if (vendor) {
      // Known SaaS vendor
      if (!discoveredVendors.has(vendor.name)) {
        apps.push({
          name:         vendor.name,
          category:     vendor.category,
          monthlySpend: 0, // will be computed from spend records
          source:       "bank_feed",
        });
        discoveredVendors.add(vendor.name);
      }

      spend.push({
        appName:     vendor.name,
        amount:      txn.amount,
        date:        new Date(txn.date),
        description: txn.merchant_name ?? txn.name,
        source:      "bank_feed",
        isRecurring: true,
      });
    } else if (isSaasLike(txn)) {
      // Unrecognized but looks like SaaS (shadow IT)
      shadowItCount++;
      spend.push({
        amount:      txn.amount,
        date:        new Date(txn.date),
        description: txn.merchant_name ?? txn.name,
        source:      "bank_feed",
        isRecurring: false,
      });
    }
  }

  return { apps, spend, shadowItCount };
}

// ─── Shadow IT heuristics ─────────────────────────────────────────────────────

function isSaasLike(txn: { amount: number; name: string; merchant_name?: string | null }): boolean {
  const desc  = (txn.merchant_name ?? txn.name).toLowerCase();
  const round = txn.amount % 1 === 0; // SaaS prices are usually whole numbers
  const small = txn.amount < 500;     // Likely a subscription, not a one-time purchase

  // Common SaaS pricing: $5, $10, $15, $20, $25, $29, $49, $99, $149, etc.
  const likelySubPrice = [5,8,9,10,12,15,19,20,25,29,39,49,59,79,99,149,199,249,299,399,499]
    .some((p) => Math.abs(txn.amount - p) < 2);

  const hasTechKeywords = /software|app\b|cloud|io\b|tech|ai\b|saas|platform/i.test(desc);

  return (round || likelySubPrice) && small && hasTechKeywords;
}

// ─── Credential check ─────────────────────────────────────────────────────────

export function isPlaidConfigured(): boolean {
  return !!(process.env.PLAID_CLIENT_ID && process.env.PLAID_SECRET);
}
