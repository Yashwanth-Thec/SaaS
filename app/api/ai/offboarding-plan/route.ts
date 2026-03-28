import { NextRequest, NextResponse }   from "next/server";
import { requireSession }              from "@/lib/auth";
import { generateOffboardingPlan }     from "@/lib/ai/offboarding-intelligence";

export async function POST(req: NextRequest) {
  let session;
  try { session = await requireSession(); }
  catch { return NextResponse.json({ error: "Unauthorized" }, { status: 401 }); }

  const { employeeId, notes } = await req.json() as { employeeId: string; notes?: string };
  if (!employeeId) return NextResponse.json({ error: "employeeId required" }, { status: 400 });

  try {
    const steps = await generateOffboardingPlan(employeeId, session.orgId, notes);
    return NextResponse.json({ steps });
  } catch (err) {
    console.error("[offboarding-plan]", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
