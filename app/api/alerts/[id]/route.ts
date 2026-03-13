import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { db } from "@/lib/db";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireSession();
    const { id }  = await params;
    const body    = await req.json();

    const alert = await db.alert.findFirst({ where: { id, orgId: session.orgId } });
    if (!alert) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const updated = await db.alert.update({
      where: { id },
      data: {
        isRead:      body.isRead      ?? undefined,
        isDismissed: body.isDismissed ?? undefined,
      },
    });

    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }
}
