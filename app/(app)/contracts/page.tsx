import { redirect } from "next/navigation";
import { requireSession } from "@/lib/auth";
import { Header } from "@/components/layout/Header";

export const metadata = { title: "Contracts" };
export default async function ContractsPage() {
  try { await requireSession(); } catch { redirect("/login"); }
  return (
    <>
      <Header title="Contracts" subtitle="Renewal dates, auto-renew flags, and negotiation leverage" />
      <div className="p-6 text-secondary text-sm">Phase C — coming next.</div>
    </>
  );
}
