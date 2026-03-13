import { NextResponse }           from "next/server";
import { requireSession }         from "@/lib/auth";
import { db }                     from "@/lib/db";
import { runRedundancyAnalysis, clearAnalysisCache } from "@/lib/ai/redundancy";

// GET — return cached (or fresh) analysis
export async function GET() {
  let session;
  try { session = await requireSession(); }
  catch { return NextResponse.json({ error: "Unauthorized" }, { status: 401 }); }

  const org = await db.organization.findUnique({ where: { id: session.orgId } });
  if (!org) return NextResponse.json({ error: "Org not found" }, { status: 404 });

  try {
    const result = await runRedundancyAnalysis(org.id, org.name);
    return NextResponse.json(result);
  } catch (err) {
    console.error("Redundancy analysis error:", err);
    return NextResponse.json({ error: "Analysis failed" }, { status: 500 });
  }
}

// POST — force re-analysis (clears cache)
export async function POST() {
  let session;
  try { session = await requireSession(); }
  catch { return NextResponse.json({ error: "Unauthorized" }, { status: 401 }); }

  const org = await db.organization.findUnique({ where: { id: session.orgId } });
  if (!org) return NextResponse.json({ error: "Org not found" }, { status: 404 });

  clearAnalysisCache(org.id);

  try {
    const result = await runRedundancyAnalysis(org.id, org.name, true);
    return NextResponse.json(result);
  } catch (err) {
    console.error("Redundancy analysis error:", err);
    return NextResponse.json({ error: "Analysis failed" }, { status: 500 });
  }
}
