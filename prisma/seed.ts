import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { randomUUID } from "crypto";

const db = new PrismaClient();

const addDays = (n: number) => new Date(Date.now() + n * 86400000);
const subDays = (n: number) => new Date(Date.now() - n * 86400000);

const PEOPLE = [
  { name: "Jordan Lee",      dept: "Engineering",  title: "Senior Engineer"     },
  { name: "Priya Sharma",    dept: "Engineering",  title: "Staff Engineer"      },
  { name: "Marcus Webb",     dept: "Engineering",  title: "Engineering Manager" },
  { name: "Chloe Nguyen",    dept: "Engineering",  title: "Senior Engineer"     },
  { name: "Devon Park",      dept: "Engineering",  title: "Engineer"            },
  { name: "Aisha Okonkwo",   dept: "Engineering",  title: "Engineer"            },
  { name: "Ryan Torres",     dept: "Engineering",  title: "Engineer"            },
  { name: "Mei Zhang",       dept: "Engineering",  title: "Senior Engineer"     },
  { name: "Omar Hassan",     dept: "Marketing",    title: "VP Marketing"        },
  { name: "Sofia Reyes",     dept: "Marketing",    title: "Content Manager"     },
  { name: "Liam O'Brien",    dept: "Marketing",    title: "Growth Manager"      },
  { name: "Zara Patel",      dept: "Marketing",    title: "Marketing Analyst"   },
  { name: "Elena Vasquez",   dept: "Marketing",    title: "Marketing Analyst"   },
  { name: "Tyler Brooks",    dept: "Design",       title: "Head of Design"      },
  { name: "Nia Johnson",     dept: "Design",       title: "Senior Designer"     },
  { name: "Sven Larsson",    dept: "Design",       title: "Product Designer"    },
  { name: "Amara Diallo",    dept: "Design",       title: "UX Researcher"       },
  { name: "Kenji Watanabe",  dept: "Sales",        title: "VP Sales"            },
  { name: "Brooke Adams",    dept: "Sales",        title: "Account Executive"   },
  { name: "Faisal Al-Amin",  dept: "Sales",        title: "Account Executive"   },
  { name: "Naomi Clarke",    dept: "Sales",        title: "Sales Dev Rep"       },
  { name: "Diego Morales",   dept: "Sales",        title: "Sales Dev Rep"       },
  { name: "Hannah Kim",      dept: "Sales",        title: "Sales Ops Manager"   },
  { name: "Alex Chen",       dept: "Operations",   title: "Head of IT"          },
  { name: "Isabelle Dupont", dept: "Operations",   title: "Operations Manager"  },
  { name: "Raj Kapoor",      dept: "Operations",   title: "IT Manager"          },
  { name: "Grace Osei",      dept: "Operations",   title: "Ops Analyst"         },
  { name: "Lucas Fernandez", dept: "Finance",      title: "CFO"                 },
  { name: "Vivian Cho",      dept: "Finance",      title: "Finance Manager"     },
  { name: "Patrick Murphy",  dept: "Finance",      title: "Finance Analyst"     },
  { name: "Simone Bernard",  dept: "HR",           title: "VP People"           },
  { name: "Ethan Wright",    dept: "HR",           title: "HR Manager"          },
  { name: "Layla Ahmed",     dept: "HR",           title: "Recruiter"           },
  { name: "Tom Harrington",  dept: "Engineering",  title: "Engineer"            },
  { name: "Nina Kovacs",     dept: "Marketing",    title: "Marketing Manager"   },
  { name: "Ben Castillo",    dept: "Sales",        title: "Account Executive"   },
  // Offboarded
  { name: "Chris Dawson",    dept: "Engineering",  title: "Senior Engineer"     },
  { name: "Rachel Moore",    dept: "Marketing",    title: "Content Manager"     },
  { name: "James Whitfield", dept: "Sales",        title: "Account Executive"   },
  { name: "Tara Singh",      dept: "Design",       title: "Product Designer"    },
];

const ACCESS_MATRIX: Record<string, string[]> = {
  Engineering: ["GitHub", "Jira", "Datadog", "Slack", "Notion", "1Password", "Zoom", "Figma"],
  Marketing:   ["HubSpot", "Slack", "Asana", "Notion", "Monday.com", "Zoom"],
  Design:      ["Figma", "Slack", "Notion", "Zoom", "Asana", "Miro"],
  Sales:       ["Salesforce", "HubSpot", "Slack", "Zoom", "Monday.com", "Loom"],
  Operations:  ["Slack", "Jira", "Asana", "Zoom", "Notion", "1Password"],
  Finance:     ["Salesforce", "Slack", "Zoom", "Notion", "1Password"],
  HR:          ["Slack", "Zoom", "Notion", "1Password", "Asana"],
};

const HIGH_PRIORITY = new Set(["Salesforce", "GitHub", "1Password", "Datadog"]);

function makeSteps(
  apps: { id: string; name: string; category: string; monthlySpend: number; totalSeats: number }[],
  state: "completed" | "in_progress" | "pending",
  doneCount = 0
) {
  const steps = apps.map((app, i) => {
    const isDone = state === "completed" || (state === "in_progress" && i < doneCount);
    return {
      id:           randomUUID(),
      appId:        app.id,
      appName:      app.name,
      category:     app.category,
      type:         "revoke_access",
      status:       isDone ? "done" : "pending",
      priority:     HIGH_PRIORITY.has(app.name) ? "high" : "medium",
      monthlySpend: app.totalSeats > 0 ? Math.round(app.monthlySpend / app.totalSeats) : 0,
      notes:        `Remove user from ${app.name}.${HIGH_PRIORITY.has(app.name) ? " ⚠ High priority — security/finance access." : ""}`,
      completedAt:  isDone ? subDays(3).toISOString() : null,
      draftEmail:   null,
    };
  });
  steps.push({
    id: randomUUID(), appId: "", appName: "All Vendors", category: "other",
    type: "notify_vendor", status: state === "completed" ? "done" : "pending",
    priority: "low", monthlySpend: 0,
    notes: "Confirm all access revoked and no pending invoices remain.",
    completedAt: state === "completed" ? subDays(2).toISOString() : null, draftEmail: null,
  });
  return JSON.stringify(steps);
}

async function main() {
  console.log("🌱 Seeding SaaS-Scrub demo data...");

  // ── Org & user ───────────────────────────────────────────────────────────────
  const org = await db.organization.upsert({
    where: { slug: "acme-corp" }, update: {},
    create: { name: "Acme Corp", slug: "acme-corp", domain: "acmecorp.io", plan: "growth" },
  });

  const hash = await bcrypt.hash("demo1234", 12);
  const adminUser = await db.user.upsert({
    where: { email: "admin@acmecorp.io" }, update: {},
    create: { name: "Alex Chen", email: "admin@acmecorp.io", passwordHash: hash, role: "owner", orgId: org.id },
  });

  // ── Employees ────────────────────────────────────────────────────────────────
  const employees = [];
  for (let i = 0; i < PEOPLE.length; i++) {
    const p = PEOPLE[i];
    const isOff = i >= 36;
    const e = await db.employee.upsert({
      where: { orgId_email: { orgId: org.id, email: `user${i}@acmecorp.io` } }, update: {},
      create: {
        orgId: org.id, name: p.name, email: `user${i}@acmecorp.io`,
        department: p.dept, jobTitle: p.title,
        status: isOff ? "offboarded" : "active",
        startDate: new Date(2022, i % 12, (i % 28) + 1),
        endDate: isOff ? subDays(14 + i * 3) : null,
      },
    });
    employees.push(e);
  }

  // ── SaaS Apps ────────────────────────────────────────────────────────────────
  const APPS = [
    { name: "Salesforce",  category: "finance",       monthlySpend: 12400, totalSeats: 80,  activeSeats: 61,  status: "active" },
    { name: "Slack",       category: "communication", monthlySpend: 8200,  totalSeats: 200, activeSeats: 187, status: "active" },
    { name: "Notion",      category: "productivity",  monthlySpend: 3200,  totalSeats: 150, activeSeats: 42,  status: "zombie" },
    { name: "Figma",       category: "design",        monthlySpend: 2800,  totalSeats: 40,  activeSeats: 38,  status: "active" },
    { name: "Jira",        category: "dev",           monthlySpend: 2400,  totalSeats: 120, activeSeats: 101, status: "active" },
    { name: "Asana",       category: "productivity",  monthlySpend: 1900,  totalSeats: 60,  activeSeats: 11,  status: "zombie" },
    { name: "Zoom",        category: "communication", monthlySpend: 1600,  totalSeats: 200, activeSeats: 148, status: "active" },
    { name: "Monday.com",  category: "productivity",  monthlySpend: 1400,  totalSeats: 50,  activeSeats: 9,   status: "zombie" },
    { name: "HubSpot",     category: "finance",       monthlySpend: 3800,  totalSeats: 30,  activeSeats: 27,  status: "active" },
    { name: "GitHub",      category: "dev",           monthlySpend: 1200,  totalSeats: 60,  activeSeats: 58,  status: "active" },
    { name: "Datadog",     category: "analytics",     monthlySpend: 2200,  totalSeats: 20,  activeSeats: 18,  status: "active" },
    { name: "1Password",   category: "security",      monthlySpend: 480,   totalSeats: 200, activeSeats: 181, status: "active" },
    { name: "Miro",        category: "design",        monthlySpend: 960,   totalSeats: 30,  activeSeats: 4,   status: "zombie" },
    { name: "Loom",        category: "communication", monthlySpend: 720,   totalSeats: 40,  activeSeats: 6,   status: "zombie" },
    { name: "Linear",      category: "dev",           monthlySpend: 640,   totalSeats: 25,  activeSeats: 22,  status: "active" },
  ];

  type AppRecord = typeof APPS[number] & { id: string };
  const createdApps: AppRecord[] = [];
  for (const app of APPS) {
    const a = await db.saasApp.upsert({
      where: { orgId_name: { orgId: org.id, name: app.name } }, update: {},
      create: { orgId: org.id, ...app, source: "google_workspace", annualSpend: app.monthlySpend * 12 },
    });
    createdApps.push({ ...app, id: a.id });
  }
  const appMap: Record<string, AppRecord> = Object.fromEntries(createdApps.map((a) => [a.name, a]));

  // ── App Access (bulk) ────────────────────────────────────────────────────────
  console.log("  Creating app access records...");
  await db.appAccess.deleteMany({ where: { employee: { orgId: org.id } } });
  const accessRows = [];
  for (const emp of employees) {
    const appNames = ACCESS_MATRIX[emp.department ?? "Operations"] ?? ACCESS_MATRIX.Operations;
    for (const appName of appNames) {
      const app = appMap[appName];
      if (!app) continue;
      const isOff = emp.status === "offboarded";
      accessRows.push({
        employeeId:  emp.id,
        appId:       app.id,
        role:        Math.random() > 0.85 ? "admin" : "user",
        lastLoginAt: isOff ? subDays(90 + Math.floor(Math.random() * 20)) : subDays(Math.floor(Math.random() * 14)),
        loginCount:  isOff ? Math.floor(Math.random() * 50) + 10 : Math.floor(Math.random() * 300) + 20,
        isActive:    !isOff,
      });
    }
  }
  await db.appAccess.createMany({ data: accessRows, skipDuplicates: true });

  // ── Usage Logs (bulk) ─────────────────────────────────────────────────────
  console.log("  Creating usage logs...");
  await db.usageLog.deleteMany({ where: { app: { orgId: org.id } } });
  const usageRows = [];
  for (const app of createdApps) {
    for (let d = 89; d >= 0; d--) {
      const date = subDays(d);
      date.setHours(0, 0, 0, 0);
      const decay = app.status === "zombie" ? 0.25 : 1;
      usageRows.push({
        appId: app.id,
        date,
        dau: Math.round(app.activeSeats * decay * (0.5 + Math.random() * 0.5)),
        mau: Math.round(app.activeSeats * decay * (0.7 + Math.random() * 0.3)),
      });
    }
  }
  await db.usageLog.createMany({ data: usageRows, skipDuplicates: true });

  // ── Contracts ─────────────────────────────────────────────────────────────
  const CONTRACTS = [
    { name: "Salesforce", vendor: "Salesforce Inc", value: 148800, cycle: "annual",  days: 23,  notice: 30, auto: true  },
    { name: "Slack",      vendor: "Salesforce Inc", value: 98400,  cycle: "annual",  days: 124, notice: 30, auto: true  },
    { name: "Notion",     vendor: "Notion Labs",    value: 38400,  cycle: "monthly", days: 12,  notice: 7,  auto: true  },
    { name: "Figma",      vendor: "Adobe Inc",      value: 33600,  cycle: "annual",  days: 189, notice: 30, auto: false },
    { name: "Jira",       vendor: "Atlassian",      value: 28800,  cycle: "annual",  days: 243, notice: 30, auto: true  },
    { name: "Asana",      vendor: "Asana Inc",      value: 22800,  cycle: "monthly", days: 8,   notice: 7,  auto: true  },
    { name: "Zoom",       vendor: "Zoom Video",     value: 19200,  cycle: "annual",  days: 58,  notice: 14, auto: true  },
    { name: "Monday.com", vendor: "Monday.com Ltd", value: 16800,  cycle: "monthly", days: 18,  notice: 7,  auto: true  },
    { name: "HubSpot",    vendor: "HubSpot Inc",    value: 45600,  cycle: "annual",  days: 67,  notice: 30, auto: true  },
    { name: "GitHub",     vendor: "Microsoft Corp", value: 14400,  cycle: "annual",  days: 156, notice: 30, auto: true  },
    { name: "Datadog",    vendor: "Datadog Inc",    value: 26400,  cycle: "monthly", days: 22,  notice: 7,  auto: true  },
    { name: "1Password",  vendor: "1Password Inc",  value: 5760,   cycle: "annual",  days: 278, notice: 30, auto: false },
    { name: "Miro",       vendor: "Miro Inc",       value: 11520,  cycle: "annual",  days: 31,  notice: 14, auto: true  },
    { name: "Loom",       vendor: "Loom Inc",       value: 8640,   cycle: "annual",  days: 45,  notice: 14, auto: true  },
    { name: "Linear",     vendor: "Linear Inc",     value: 7680,   cycle: "annual",  days: 201, notice: 30, auto: true  },
  ];

  for (const c of CONTRACTS) {
    const app = appMap[c.name];
    if (!app) continue;
    const renewal = addDays(c.days);
    const start   = c.cycle === "monthly"
      ? new Date(renewal.getTime() - 30 * 86400000)
      : new Date(new Date(renewal).setFullYear(renewal.getFullYear() - 1));
    await db.contract.upsert({
      where: { appId: app.id }, update: {},
      create: { orgId: org.id, appId: app.id, vendor: c.vendor, value: c.value, billingCycle: c.cycle, startDate: start, renewalDate: renewal, autoRenews: c.auto, noticeDays: c.notice, status: "active" },
    });
  }

  // ── Spend Records (bulk, 12 months) ──────────────────────────────────────
  console.log("  Creating spend records...");
  await db.spendRecord.deleteMany({ where: { orgId: org.id } });
  const spendRows = [];
  const now = new Date();
  for (let m = 11; m >= 0; m--) {
    const d = new Date(now.getFullYear(), now.getMonth() - m, 1);
    for (const app of createdApps) {
      spendRows.push({
        orgId: org.id, appId: app.id,
        amount: Math.round(app.monthlySpend * (0.93 + Math.random() * 0.14)),
        date: d, source: "bank_feed", isRecurring: true,
      });
    }
  }
  await db.spendRecord.createMany({ data: spendRows });

  // ── Integrations ──────────────────────────────────────────────────────────
  const INTEGRATIONS = [
    { type: "google_workspace", name: "Google Workspace", status: "connected", syncCount: 47, lastSyncAt: subDays(0) },
    { type: "plaid",            name: "Plaid Bank Feed",  status: "connected", syncCount: 12, lastSyncAt: subDays(1) },
    { type: "okta",             name: "Okta",             status: "pending",   syncCount: 0,  lastSyncAt: null       },
    { type: "csv",              name: "CSV Import",       status: "connected", syncCount: 3,  lastSyncAt: subDays(7) },
  ];
  for (const i of INTEGRATIONS) {
    await db.integration.upsert({
      where: { orgId_type: { orgId: org.id, type: i.type } }, update: {},
      create: { orgId: org.id, ...i },
    });
  }

  // ── Alerts ────────────────────────────────────────────────────────────────
  await db.alert.deleteMany({ where: { orgId: org.id } });
  await db.alert.createMany({
    data: [
      { orgId: org.id, type: "renewal_upcoming", severity: "critical", title: "Salesforce renews in 23 days",     body: "Contract value $148,800. Auto-renews. Notice period: 30 days — act now to renegotiate or cancel." },
      { orgId: org.id, type: "zombie_app",        severity: "critical", title: "Notion: 72% seats unused",         body: "108 of 150 seats with no login in 90+ days. Cancel or downgrade to save $2,304/mo." },
      { orgId: org.id, type: "renewal_upcoming",  severity: "warning",  title: "Asana renews in 8 days",           body: "Monthly, auto-renews. 82% of seats idle — cancel before renewal to save $1,900/mo." },
      { orgId: org.id, type: "renewal_upcoming",  severity: "warning",  title: "Monday.com renews in 18 days",     body: "Monthly, auto-renews. 82% of seats idle. Cancelling saves $1,400/mo." },
      { orgId: org.id, type: "renewal_upcoming",  severity: "warning",  title: "Datadog renews in 22 days",        body: "Monthly contract worth $26,400/yr. Pricing 28% above benchmark — push for a discount." },
      { orgId: org.id, type: "renewal_upcoming",  severity: "info",     title: "Miro renews in 31 days",           body: "Annual contract $11,520. Only 4 of 30 seats active — strong cancellation candidate." },
      { orgId: org.id, type: "redundancy",        severity: "warning",  title: "3 overlapping project tools",      body: "Asana, Monday.com, and Notion all overlap. Consolidating to one saves ~$5,100/mo." },
      { orgId: org.id, type: "redundancy",        severity: "info",     title: "Duplicate video tools",            body: "Zoom and Loom both in use for async video. Loom has 85% idle seats. Consolidate to save $720/mo." },
      { orgId: org.id, type: "zombie_app",        severity: "warning",  title: "Asana: 82% seats idle",            body: "49 of 60 seats with zero activity in 60+ days. Downgrade to free tier." },
      { orgId: org.id, type: "zombie_app",        severity: "warning",  title: "Monday.com: 82% seats idle",       body: "41 of 50 seats inactive for 60+ days. Likely displaced by Asana or Notion." },
      { orgId: org.id, type: "zombie_app",        severity: "warning",  title: "Miro: 87% seats idle",             body: "26 of 30 Miro seats unused. Team migrated to Figma for whiteboarding." },
      { orgId: org.id, type: "shadow_it",         severity: "info",     title: "Shadow IT: Canva detected",        body: "Canva charges in bank feed but no license on record. 3 employees expensing individually ($87/mo)." },
      { orgId: org.id, type: "unused_seats",      severity: "info",     title: "Salesforce: 24% seats unassigned", body: "19 of 80 paid Salesforce seats never activated. Downgrade tier to save $2,976/mo." },
      { orgId: org.id, type: "unused_seats",      severity: "info",     title: "Loom: 85% seats idle",             body: "34 of 40 Loom seats with no activity in 45 days." },
    ],
  });

  // ── Offboardings ──────────────────────────────────────────────────────────
  const offEmp = employees.slice(36); // Chris, Rachel, James, Tara

  const getApps = (names: string[]) => names.map((n) => appMap[n]).filter(Boolean);

  await db.offboarding.deleteMany({ where: { orgId: org.id } });

  await db.offboarding.createMany({
    data: [
      {
        id: randomUUID(), orgId: org.id, employeeId: offEmp[0].id, createdById: adminUser.id,
        status: "completed", completedAt: subDays(12),
        steps: makeSteps(getApps(["GitHub", "Jira", "Datadog", "Slack", "Notion", "1Password", "Zoom"]), "completed"),
        notes: "All access revoked. Invoice reconciled with finance.",
      },
      {
        id: randomUUID(), orgId: org.id, employeeId: offEmp[1].id, createdById: adminUser.id,
        status: "in_progress",
        steps: makeSteps(getApps(["HubSpot", "Slack", "Asana", "Notion", "Monday.com", "Zoom"]), "in_progress", 3),
        notes: "HubSpot data export pending. Waiting on manager approval.",
      },
      {
        id: randomUUID(), orgId: org.id, employeeId: offEmp[2].id, createdById: adminUser.id,
        status: "in_progress",
        steps: makeSteps(getApps(["Salesforce", "HubSpot", "Slack", "Zoom", "Monday.com"]), "in_progress", 1),
        notes: "Salesforce data transfer required before access revocation.",
      },
      {
        id: randomUUID(), orgId: org.id, employeeId: offEmp[3].id, createdById: adminUser.id,
        status: "pending",
        steps: makeSteps(getApps(["Figma", "Slack", "Notion", "Zoom", "Asana", "Miro"]), "pending"),
      },
    ],
  });

  console.log("✅ Seed complete.");
  console.log("   Login:     admin@acmecorp.io / demo1234");
  console.log("   Apps:      15  |  Employees: 40  |  Alerts: 14");
  console.log("   Contracts: 15  |  Offboardings: 4  (1 complete, 2 in-progress, 1 pending)");
  console.log("   Spend:     12 months  |  Usage logs: 90 days");
}

main()
  .catch(console.error)
  .finally(() => db.$disconnect());
