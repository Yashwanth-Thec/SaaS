/**
 * Shared, browser-safe category utilities.
 * No Node.js-only imports allowed here.
 */

const CATEGORY_HINTS: Record<string, string> = {
  slack: "communication", zoom: "communication", teams: "communication",
  gmail: "communication", meet: "communication", webex: "communication",
  loom: "communication", intercom: "communication", zendesk: "communication",
  figma: "design", sketch: "design", canva: "design", invision: "design",
  miro: "design", adobe: "design",
  github: "dev", gitlab: "dev", jira: "dev", linear: "dev", datadog: "analytics",
  notion: "productivity", asana: "productivity", trello: "productivity",
  monday: "productivity", clickup: "productivity", dropbox: "productivity",
  salesforce: "finance", hubspot: "finance", stripe: "finance", quickbooks: "finance",
  workday: "hr", rippling: "hr", bamboohr: "hr", gusto: "hr",
  okta: "security", onelogin: "security", "1password": "security", lastpass: "security",
  looker: "analytics", tableau: "analytics", mixpanel: "analytics",
};

export function guessCategory(appName: string): string {
  const lower = appName.toLowerCase();
  for (const [hint, cat] of Object.entries(CATEGORY_HINTS)) {
    if (lower.includes(hint)) return cat;
  }
  return "other";
}

export const CSV_TEMPLATES = {
  app_inventory: `Name,Monthly Cost,Seats,Active Seats,Category
Slack,8200,200,187,communication
Notion,3200,150,42,productivity
Figma,2800,40,38,design
`,
  bank_statement: `Date,Description,Amount
2025-03-01,SLACK TECHNOLOGIES,8200.00
2025-03-01,ZOOM VIDEO COMMUNICATIONS,1600.00
2025-03-02,NOTION LABS INC,3200.00
`,
  employee_list: `Name,Email,Department,Title
Jane Smith,jane@company.com,Engineering,Senior Engineer
Bob Jones,bob@company.com,Marketing,Head of Growth
`,
} as const;
