import { NextResponse }        from "next/server";
import { requireSession }      from "@/lib/auth";
import { runSavingsCommittee } from "@/lib/ai/savings-committee";

export async function POST() {
  let session;
  try { session = await requireSession(); }
  catch { return NextResponse.json({ error: "Unauthorized" }, { status: 401 }); }

  try {
    const plan = await runSavingsCommittee(session.orgId);
    return NextResponse.json(plan);
  } catch (err) {
    console.error("[savings-plan]", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
