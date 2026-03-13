import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const db = new PrismaClient();

async function main() {
  console.log("🌱 Seeding SaaS-Scrub demo data...");

  // ── Org ────────────────────────────────────────────────────────────────────
  const org = await db.organization.upsert({
    where: { slug: "acme-corp" },
    update: {},
    create: {
      name:   "Acme Corp",
      slug:   "acme-corp",
      domain: "acmecorp.io",
      plan:   "growth",
    },
  });

  // ── Admin user ─────────────────────────────────────────────────────────────
  const hash = await bcrypt.hash("demo1234", 12);
  await db.user.upsert({
    where: { email: "admin@acmecorp.io" },
    update: {},
    create: {
      name:         "Alex Chen",
      email:        "admin@acmecorp.io",
      passwordHash: hash,
      role:         "owner",
      orgId:        org.id,
    },
  });

  // ── Employees ──────────────────────────────────────────────────────────────
  const depts = ["Engineering", "Marketing", "Design", "Sales", "Operations", "HR"];
  const employees = [];
  for (let i = 0; i < 40; i++) {
    const e = await db.employee.upsert({
      where: { orgId_email: { orgId: org.id, email: `user${i}@acmecorp.io` } },
      update: {},
      create: {
        orgId:      org.id,
        name:       `Employee ${i + 1}`,
        email:      `user${i}@acmecorp.io`,
        department: depts[i % depts.length],
        jobTitle:   i % 3 === 0 ? "Senior Engineer" : i % 3 === 1 ? "Manager" : "Analyst",
        status:     i < 36 ? "active" : "offboarded",
        startDate:  new Date(2022, i % 12, (i % 28) + 1),
      },
    });
    employees.push(e);
  }

  // ── SaaS Apps ──────────────────────────────────────────────────────────────
  const APPS = [
    { name: "Salesforce",    category: "finance",       monthlySpend: 12400, totalSeats: 80,  activeSeats: 61,  status: "active"  },
    { name: "Slack",         category: "communication", monthlySpend: 8200,  totalSeats: 200, activeSeats: 187, status: "active"  },
    { name: "Notion",        category: "productivity",  monthlySpend: 3200,  totalSeats: 150, activeSeats: 42,  status: "zombie"  },
    { name: "Figma",         category: "design",        monthlySpend: 2800,  totalSeats: 40,  activeSeats: 38,  status: "active"  },
    { name: "Jira",          category: "dev",           monthlySpend: 2400,  totalSeats: 120, activeSeats: 101, status: "active"  },
    { name: "Asana",         category: "productivity",  monthlySpend: 1900,  totalSeats: 60,  activeSeats: 11,  status: "zombie"  },
    { name: "Zoom",          category: "communication", monthlySpend: 1600,  totalSeats: 200, activeSeats: 148, status: "active"  },
    { name: "Monday.com",    category: "productivity",  monthlySpend: 1400,  totalSeats: 50,  activeSeats: 9,   status: "zombie"  },
    { name: "HubSpot",       category: "finance",       monthlySpend: 3800,  totalSeats: 30,  activeSeats: 27,  status: "active"  },
    { name: "GitHub",        category: "dev",           monthlySpend: 1200,  totalSeats: 60,  activeSeats: 58,  status: "active"  },
    { name: "Datadog",       category: "analytics",     monthlySpend: 2200,  totalSeats: 20,  activeSeats: 18,  status: "active"  },
    { name: "1Password",     category: "security",      monthlySpend: 480,   totalSeats: 200, activeSeats: 181, status: "active"  },
  ];

  const createdApps = [];
  for (const app of APPS) {
    const created = await db.saasApp.upsert({
      where: { orgId_name: { orgId: org.id, name: app.name } },
      update: {},
      create: { orgId: org.id, ...app, source: "manual", annualSpend: app.monthlySpend * 12 },
    });
    createdApps.push(created);
  }

  // ── Spend records (6 months) ───────────────────────────────────────────────
  const now = new Date();
  for (let m = 5; m >= 0; m--) {
    const d     = new Date(now.getFullYear(), now.getMonth() - m, 1);
    const jitter= 0.93 + Math.random() * 0.14;
    for (const app of createdApps) {
      await db.spendRecord.create({
        data: {
          orgId:       org.id,
          appId:       app.id,
          amount:      Math.round(app.monthlySpend * jitter),
          date:        d,
          source:      "manual",
          isRecurring: true,
        },
      });
    }
  }

  // ── Alerts ────────────────────────────────────────────────────────────────
  const ALERTS = [
    { type: "zombie_app",       severity: "critical", title: "Notion: 72% seats unused",       body: "108 of 150 seats have had no login in 90+ days. Potential savings: $2,304/mo." },
    { type: "renewal_upcoming", severity: "warning",  title: "Salesforce renews in 23 days",   body: "Contract value: $148,800. Benchmark: you're paying 34% above market." },
    { type: "redundancy",       severity: "warning",  title: "3 overlapping project tools",    body: "Asana, Monday.com, and Notion overlap. Consolidating saves ~$5,100/mo." },
    { type: "unused_seats",     severity: "info",     title: "Asana: 82% seats idle",          body: "49 of 60 seats unused. Consider downgrading to free tier." },
  ];
  for (const a of ALERTS) {
    await db.alert.create({ data: { orgId: org.id, ...a } });
  }

  console.log("✅ Seed complete.");
  console.log("   Login: admin@acmecorp.io / demo1234");
}

main()
  .catch(console.error)
  .finally(() => db.$disconnect());
