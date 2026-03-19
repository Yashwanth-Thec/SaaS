import { requireSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { ComplianceClient } from "./ComplianceClient";

// ─── Types (re-exported for the client) ───────────────────────────────────────

export type OrgInfo = { name: string; plan: string; slug: string };

export type AppAccessWithEmployee = {
  id: string;
  employeeId: string;
  appId: string;
  role: string | null;
  lastLoginAt: Date | null;
  loginCount: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  employee: {
    id: string;
    name: string;
    email: string;
    department: string | null;
    status: string;
  };
};

export type SaasAppWithAccess = {
  id: string;
  name: string;
  vendor: string | null;
  category: string;
  status: string;
  totalSeats: number;
  activeSeats: number;
  monthlySpend: number;
  lastDetectedAt: Date;
  appAccess: AppAccessWithEmployee[];
};

export type EmployeeWithAccess = {
  id: string;
  name: string;
  email: string;
  department: string | null;
  status: string;
  appAccess: {
    id: string;
    role: string | null;
    isActive: boolean;
    app: { id: string; name: string };
  }[];
};

export type OffboardingWithEmployee = {
  id: string;
  status: string;
  steps: string;
  completedAt: Date | null;
  createdAt: Date;
  employee: { id: string; name: string; email: string; department: string | null };
};

export type ContractWithApp = {
  id: string;
  vendor: string;
  value: number;
  renewalDate: Date;
  autoRenews: boolean;
  noticeDays: number;
  app: { id: string; name: string };
};

export type AlertRow = {
  id: string;
  severity: string;
  title: string;
  appId: string | null;
  createdAt: Date;
};

export type ComplianceData = {
  org: OrgInfo;
  generatedAt: string;
  apps: SaasAppWithAccess[];
  employees: EmployeeWithAccess[];
  offboardings: OffboardingWithEmployee[];
  contracts: ContractWithApp[];
  alerts: AlertRow[];
  summary: {
    totalApps: number;
    totalSpend: number;
    activeEmployees: number;
    pendingOffboardings: number;
    expiringContracts: number;
    unresolvedAlerts: number;
  };
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function CompliancePage() {
  const session = await requireSession();
  const { orgId } = session;

  const now = new Date();
  const in30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  const [org, apps, employees, offboardings, alerts, contracts] =
    await Promise.all([
      db.organization.findUniqueOrThrow({
        where: { id: orgId },
        select: { name: true, plan: true, slug: true },
      }),
      db.saasApp.findMany({
        where: { orgId },
        include: {
          appAccess: {
            include: {
              employee: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  department: true,
                  status: true,
                },
              },
            },
          },
        },
        orderBy: { name: "asc" },
      }),
      db.employee.findMany({
        where: { orgId },
        include: {
          appAccess: {
            include: { app: { select: { id: true, name: true } } },
          },
        },
        orderBy: { name: "asc" },
      }),
      db.offboarding.findMany({
        where: { orgId },
        include: {
          employee: {
            select: {
              id: true,
              name: true,
              email: true,
              department: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      }),
      db.alert.findMany({
        where: { orgId, isRead: false },
        orderBy: { createdAt: "desc" },
      }),
      db.contract.findMany({
        where: { orgId },
        include: { app: { select: { id: true, name: true } } },
        orderBy: { renewalDate: "asc" },
      }),
    ]);

  const totalSpend = apps.reduce((sum, a) => sum + a.monthlySpend, 0);
  const activeEmployees = employees.filter((e) => e.status === "active").length;
  const pendingOffboardings = offboardings.filter(
    (o) => o.status !== "completed"
  ).length;
  const expiringContracts = contracts.filter(
    (c) => c.renewalDate <= in30Days && c.renewalDate >= now
  ).length;

  const data: ComplianceData = {
    org,
    generatedAt: now.toISOString(),
    apps: apps as SaasAppWithAccess[],
    employees: employees as EmployeeWithAccess[],
    offboardings: offboardings as OffboardingWithEmployee[],
    contracts: contracts as ContractWithApp[],
    alerts: alerts as AlertRow[],
    summary: {
      totalApps: apps.length,
      totalSpend,
      activeEmployees,
      pendingOffboardings,
      expiringContracts,
      unresolvedAlerts: alerts.length,
    },
  };

  return <ComplianceClient data={data} />;
}
