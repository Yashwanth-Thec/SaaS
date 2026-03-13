import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session  = await requireSession();
    const { id }   = await params;

    const app = await db.saasApp.findFirst({
      where:   { id, orgId: session.orgId },
      include: {
        contract:  true,
        appAccess: {
          include: { employee: true },
          orderBy: { lastLoginAt: "desc" },
          take:    50,
        },
        spendRecords: {
          orderBy: { date: "desc" },
          take:    12,
        },
      },
    });

    if (!app) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(app);
  } catch {
    return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireSession();
    const { id }  = await params;
    const body    = await req.json();

    const app = await db.saasApp.findFirst({ where: { id, orgId: session.orgId } });
    if (!app) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const updated = await db.saasApp.update({
      where: { id },
      data: {
        status:       body.status       ?? undefined,
        notes:        body.notes        ?? undefined,
        monthlySpend: body.monthlySpend ?? undefined,
        totalSeats:   body.totalSeats   ?? undefined,
        activeSeats:  body.activeSeats  ?? undefined,
        category:     body.category     ?? undefined,
      },
    });

    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireSession();
    const { id }  = await params;

    const app = await db.saasApp.findFirst({ where: { id, orgId: session.orgId } });
    if (!app) return NextResponse.json({ error: "Not found" }, { status: 404 });

    await db.saasApp.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Delete failed" }, { status: 500 });
  }
}
