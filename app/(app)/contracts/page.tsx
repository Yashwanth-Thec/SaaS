import { redirect } from "next/navigation";
import { requireSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { Header } from "@/components/layout/Header";
import { ContractsClient } from "./ContractsClient";

export const metadata = { title: "Contracts" };

export default async function ContractsPage() {
  let session;
  try { session = await requireSession(); } catch { redirect("/login"); }

  const contracts = await db.contract.findMany({
    where: { orgId: session.orgId },
    include: { app: true },
    orderBy: { renewalDate: "asc" },
  });

  const today = new Date();
  const enriched = contracts.map((c) => ({
    ...c,
    daysUntilRenewal: Math.ceil(
      (new Date(c.renewalDate).getTime() - today.getTime()) / 86400000
    ),
  }));

  const totalAnnualValue = enriched.reduce((s, c) => s + c.value, 0);
  const autoRenewCount   = enriched.filter((c) => c.autoRenews).length;
  const expiringCount    = enriched.filter((c) => c.daysUntilRenewal <= 30).length;
  const inNoticeCount    = enriched.filter(
    (c) => c.autoRenews && c.daysUntilRenewal <= c.noticeDays
  ).length;

  const serialized = enriched.map((c) => ({
    id:               c.id,
    vendor:           c.vendor,
    value:            c.value,
    billingCycle:     c.billingCycle,
    renewalDate:      c.renewalDate.toISOString(),
    autoRenews:       c.autoRenews,
    noticeDays:       c.noticeDays,
    status:           c.status,
    daysUntilRenewal: c.daysUntilRenewal,
    app: {
      id:           c.app.id,
      name:         c.app.name,
      category:     c.app.category,
      monthlySpend: c.app.monthlySpend,
    },
  }));

  return (
    <>
      <Header
        title="Contracts"
        subtitle="Renewal dates, contract values, and auto-renew alerts"
      />
      <ContractsClient
        contracts={serialized}
        totalAnnualValue={totalAnnualValue}
        autoRenewCount={autoRenewCount}
        expiringCount={expiringCount}
        inNoticeCount={inNoticeCount}
      />
    </>
  );
}
