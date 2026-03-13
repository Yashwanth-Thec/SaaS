/**
 * CSV Integration
 *
 * Supports three import formats — auto-detected from headers:
 *
 *   1. Bank Statement:  date, description, amount  → SpendRecords + SaasApp discovery
 *   2. App Inventory:   name, monthly_cost, seats, active_seats, category → SaasApps
 *   3. Employee List:   name, email, department, title → Employees
 *
 * Returns normalized data ready for the sync engine.
 */

import Papa from "papaparse";
import { guessCategory } from "./categories";
import type {
  DiscoveredEmployee,
  DiscoveredApp,
  DiscoveredSpend,
} from "./sync-engine";

// ─── Known SaaS vendors for bank-feed detection ───────────────────────────────

const SAAS_VENDORS: { pattern: RegExp; name: string; category: string }[] = [
  { pattern: /slack/i,          name: "Slack",        category: "communication" },
  { pattern: /zoom/i,           name: "Zoom",         category: "communication" },
  { pattern: /microsoft\s*365/i,name: "Microsoft 365",category: "productivity"  },
  { pattern: /google\s*workspace/i,name:"Google Workspace",category:"productivity"},
  { pattern: /notion/i,         name: "Notion",       category: "productivity"  },
  { pattern: /asana/i,          name: "Asana",        category: "productivity"  },
  { pattern: /monday\.com/i,    name: "Monday.com",   category: "productivity"  },
  { pattern: /figma/i,          name: "Figma",        category: "design"        },
  { pattern: /github/i,         name: "GitHub",       category: "dev"           },
  { pattern: /gitlab/i,         name: "GitLab",       category: "dev"           },
  { pattern: /jira|atlassian/i, name: "Jira",         category: "dev"           },
  { pattern: /salesforce/i,     name: "Salesforce",   category: "finance"       },
  { pattern: /hubspot/i,        name: "HubSpot",      category: "finance"       },
  { pattern: /datadog/i,        name: "Datadog",      category: "analytics"     },
  { pattern: /mixpanel/i,       name: "Mixpanel",     category: "analytics"     },
  { pattern: /okta/i,           name: "Okta",         category: "security"      },
  { pattern: /1password/i,      name: "1Password",    category: "security"      },
  { pattern: /dropbox/i,        name: "Dropbox",      category: "productivity"  },
  { pattern: /adobe/i,          name: "Adobe CC",     category: "design"        },
  { pattern: /loom/i,           name: "Loom",         category: "communication" },
  { pattern: /linear/i,         name: "Linear",       category: "dev"           },
  { pattern: /intercom/i,       name: "Intercom",     category: "communication" },
  { pattern: /twilio/i,         name: "Twilio",       category: "dev"           },
  { pattern: /sendgrid/i,       name: "SendGrid",     category: "communication" },
  { pattern: /zendesk/i,        name: "Zendesk",      category: "communication" },
];

// ─── CSV format detection ─────────────────────────────────────────────────────

type CsvFormat = "bank_statement" | "app_inventory" | "employee_list" | "unknown";

function detectFormat(headers: string[]): CsvFormat {
  const lower = headers.map((h) => h.toLowerCase().trim().replace(/\s+/g, "_"));

  const hasDescription = lower.some((h) => h.includes("description") || h.includes("memo") || h.includes("narration"));
  const hasAmount      = lower.some((h) => h === "amount" || h === "debit" || h === "credit" || h.includes("amount"));
  const hasDate        = lower.some((h) => h.includes("date"));
  if (hasDate && hasAmount && hasDescription) return "bank_statement";

  const hasAppName  = lower.some((h) => h === "name" || h === "app" || h === "tool" || h === "application" || h === "app_name");
  const hasCost     = lower.some((h) => h.includes("cost") || h.includes("spend") || h.includes("price") || h.includes("monthly"));
  const hasSeats    = lower.some((h) => h.includes("seat") || h.includes("license") || h.includes("user"));
  if (hasAppName && (hasCost || hasSeats)) return "app_inventory";

  const hasEmail = lower.some((h) => h === "email" || h.includes("email"));
  const hasName  = lower.some((h) => h === "name" || h === "full_name" || h === "employee");
  if (hasEmail && hasName) return "employee_list";

  return "unknown";
}

// ─── Column normalizer ────────────────────────────────────────────────────────

function findCol(row: Record<string, string>, ...candidates: string[]): string | undefined {
  for (const key of Object.keys(row)) {
    const norm = key.toLowerCase().trim().replace(/\s+/g, "_");
    if (candidates.includes(norm)) return row[key]?.trim() || undefined;
  }
  return undefined;
}

// ─── Parsers per format ───────────────────────────────────────────────────────

function parseBankStatement(rows: Record<string, string>[]): {
  apps: DiscoveredApp[];
  spend: DiscoveredSpend[];
} {
  const apps: DiscoveredApp[] = [];
  const spend: DiscoveredSpend[] = [];
  const discoveredApps = new Set<string>();

  for (const row of rows) {
    const dateStr = findCol(row, "date", "transaction_date", "posted_date");
    const desc    = findCol(row, "description", "memo", "narration", "details");
    const amtStr  = findCol(row, "amount", "debit", "credit", "transaction_amount");

    if (!dateStr || !desc || !amtStr) continue;

    const amount = Math.abs(parseFloat(amtStr.replace(/[,$]/g, "")));
    if (isNaN(amount) || amount <= 0) continue;

    const date = new Date(dateStr);
    if (isNaN(date.getTime())) continue;

    // Identify SaaS vendor
    const vendor = SAAS_VENDORS.find((v) => v.pattern.test(desc));

    if (vendor && !discoveredApps.has(vendor.name)) {
      apps.push({
        name:     vendor.name,
        category: vendor.category,
        source:   "bank_feed",
      });
      discoveredApps.add(vendor.name);
    }

    spend.push({
      appName:     vendor?.name,
      amount,
      date,
      description: desc,
      source:      "bank_feed",
      isRecurring: !!vendor, // SaaS charges are typically recurring
    });
  }

  return { apps, spend };
}

function parseAppInventory(rows: Record<string, string>[]): { apps: DiscoveredApp[] } {
  const apps: DiscoveredApp[] = [];

  for (const row of rows) {
    const name    = findCol(row, "name", "app", "tool", "application", "app_name", "software");
    const costStr = findCol(row, "monthly_cost", "monthly_spend", "cost", "price", "monthly_fee", "spend");
    const totalStr= findCol(row, "seats", "licenses", "total_seats", "total_users", "users");
    const activeStr=findCol(row, "active_seats", "active_users", "active_licenses");
    const category= findCol(row, "category", "type", "department");

    if (!name) continue;

    apps.push({
      name,
      category:     category ? guessCategory(category) : guessCategory(name),
      monthlySpend: costStr  ? parseFloat(costStr.replace(/[,$]/g, "")) || 0 : 0,
      totalSeats:   totalStr ? parseInt(totalStr, 10) || 0 : 0,
      source:       "csv",
    });
  }

  return { apps };
}

function parseEmployeeList(rows: Record<string, string>[]): { employees: DiscoveredEmployee[] } {
  const employees: DiscoveredEmployee[] = [];

  for (const row of rows) {
    const email = findCol(row, "email", "work_email", "email_address");
    const name  = findCol(row, "name", "full_name", "employee_name", "employee");
    if (!email || !name) continue;

    employees.push({
      email,
      name,
      department: findCol(row, "department", "dept", "team", "division"),
      jobTitle:   findCol(row, "title", "job_title", "position", "role"),
      status:     "active",
    });
  }

  return { employees };
}

// ─── Main parse function ──────────────────────────────────────────────────────

export interface CsvParseResult {
  format:    CsvFormat;
  rowCount:  number;
  employees: DiscoveredEmployee[];
  apps:      DiscoveredApp[];
  spend:     DiscoveredSpend[];
  errors:    string[];
}

export function parseCsv(csvText: string): CsvParseResult {
  const result: CsvParseResult = {
    format:    "unknown",
    rowCount:  0,
    employees: [],
    apps:      [],
    spend:     [],
    errors:    [],
  };

  const parsed = Papa.parse<Record<string, string>>(csvText, {
    header:        true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim(),
  });

  if (parsed.errors.length > 0) {
    result.errors = parsed.errors.map((e) => e.message);
  }

  const rows = parsed.data;
  if (rows.length === 0) {
    result.errors.push("No data rows found in file");
    return result;
  }

  result.rowCount = rows.length;
  result.format   = detectFormat(Object.keys(rows[0]));

  try {
    switch (result.format) {
      case "bank_statement": {
        const { apps, spend } = parseBankStatement(rows);
        result.apps  = apps;
        result.spend = spend;
        break;
      }
      case "app_inventory": {
        const { apps } = parseAppInventory(rows);
        result.apps = apps;
        break;
      }
      case "employee_list": {
        const { employees } = parseEmployeeList(rows);
        result.employees = employees;
        break;
      }
      default:
        result.errors.push(
          "Could not detect CSV format. Expected headers for: bank statement (date, description, amount), app inventory (name, cost, seats), or employee list (name, email)."
        );
    }
  } catch (err) {
    result.errors.push(String(err));
  }

  return result;
}

// CSV_TEMPLATES re-exported from categories (browser-safe)
export { CSV_TEMPLATES } from "./categories";
