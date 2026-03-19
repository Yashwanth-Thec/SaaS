import { redirect } from "next/navigation";
import { requireSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { Header } from "@/components/layout/Header";
import { SettingsClient } from "./SettingsClient";

export const metadata = { title: "Settings" };

export default async function SettingsPage() {
  let session;
  try { session = await requireSession(); } catch { redirect("/login"); }

  const [org, users, slackIntegration] = await Promise.all([
    db.organization.findUnique({ where: { id: session.orgId } }),
    db.user.findMany({ where: { orgId: session.orgId }, orderBy: { createdAt: "asc" } }),
    db.integration.findFirst({ where: { orgId: session.orgId, type: "slack" } }),
  ]);

  if (!org) redirect("/login");

  let slackWebhookUrl: string | null = null;
  if (slackIntegration?.config) {
    try {
      const parsed = JSON.parse(slackIntegration.config);
      slackWebhookUrl = parsed.webhookUrl ?? null;
    } catch {
      // malformed config — leave null
    }
  }

  return (
    <>
      <Header title="Settings" subtitle="Workspace, team, and notification preferences" />
      <SettingsClient
        org={{
          id:     org.id,
          name:   org.name,
          slug:   org.slug,
          domain: org.domain ?? null,
          plan:   org.plan,
        }}
        users={users.map((u) => ({
          id:        u.id,
          name:      u.name,
          email:     u.email,
          role:      u.role,
          createdAt: u.createdAt.toISOString(),
        }))}
        slackWebhookUrl={slackWebhookUrl}
      />
    </>
  );
}
