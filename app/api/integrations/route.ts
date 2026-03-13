import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const session = await requireSession();
    const integrations = await db.integration.findMany({
      where: { orgId: session.orgId },
      orderBy: { createdAt: "asc" },
    });
    return NextResponse.json(integrations);
  } catch {
    return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  }
}
