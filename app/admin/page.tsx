import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { AdminClient } from "./AdminClient";

export default async function AdminPage() {
  const user = await getCurrentUser();
  if (!user || user.role !== "owner") redirect("/dashboard");

  const orgs = await db.organization.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { users: true } },
    },
  });

  return <AdminClient orgs={orgs} currentOrgId={user.org.id} />;
}
