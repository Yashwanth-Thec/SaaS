import { redirect } from "next/navigation";
import { requireSession } from "@/lib/auth";
import { Header } from "@/components/layout/Header";

export const metadata = { title: "Settings" };
export default async function SettingsPage() {
  try { await requireSession(); } catch { redirect("/login"); }
  return (
    <>
      <Header title="Settings" subtitle="Workspace, billing, and team management" />
      <div className="p-6 text-secondary text-sm">Coming soon.</div>
    </>
  );
}
