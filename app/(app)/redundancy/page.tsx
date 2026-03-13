import { redirect }                from "next/navigation";
import { requireSession }         from "@/lib/auth";
import { db }                     from "@/lib/db";
import { Header }                 from "@/components/layout/Header";
import { RedundancyClient }       from "./RedundancyClient";
import { runRedundancyAnalysis }  from "@/lib/ai/redundancy";
import { hasOpenRouterKey }       from "@/lib/ai/openrouter";

export const metadata = { title: "AI Redundancy Analysis — SaaS-Scrub" };

export default async function RedundancyPage() {
  let session;
  try { session = await requireSession(); }
  catch { redirect("/login"); }

  const org = await db.organization.findUnique({ where: { id: session.orgId } });
  if (!org) redirect("/login");

  const analysis = await runRedundancyAnalysis(org.id, org.name);
  const aiKeySet = hasOpenRouterKey();

  return (
    <>
      <Header
        title="AI Redundancy Detection"
        subtitle={
          analysis.redundantCategories > 0
            ? `${analysis.redundantCategories} overlap${analysis.redundantCategories > 1 ? "s" : ""} detected · $${analysis.totalPotentialSavings.toLocaleString()}/mo potential savings`
            : "Scanning your SaaS stack for overlapping tools"
        }
      />
      <RedundancyClient analysis={analysis} aiKeySet={aiKeySet} />
    </>
  );
}
