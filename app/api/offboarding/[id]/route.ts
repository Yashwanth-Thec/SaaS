import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireSession();
    const { id }  = await params;

    const offboarding = await db.offboarding.findFirst({
      where:   { id, orgId: session.orgId },
      include: {
        employee:  true,
        createdBy: { select: { id: true, name: true } },
      },
    });

    if (!offboarding) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(offboarding);
  } catch {
    return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  }
}
