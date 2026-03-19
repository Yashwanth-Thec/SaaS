import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { Sidebar } from "@/components/layout/Sidebar";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const alertCount = await db.alert.count({
    where: { orgId: user.org.id, isDismissed: false, severity: "critical" },
  });

  return (
    <div className="flex h-screen overflow-hidden bg-base">
      <Sidebar
        orgName={user.org.name}
        orgPlan={user.org.plan}
        userName={user.name}
        alertCount={alertCount}
      />
      <main className="flex-1 overflow-y-auto min-w-0">
        {children}
      </main>
    </div>
  );
}
