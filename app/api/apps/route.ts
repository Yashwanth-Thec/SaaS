import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const session = await requireSession();
    const { searchParams } = req.nextUrl;

    const search   = searchParams.get("q")        ?? "";
    const category = searchParams.get("category") ?? "all";
    const status   = searchParams.get("status")   ?? "all";
    const sort     = searchParams.get("sort")      ?? "spend";

    const apps = await db.saasApp.findMany({
      where: {
        orgId: session.orgId,
        ...(search   ? { name: { contains: search } } : {}),
        ...(category !== "all" ? { category } : {}),
        ...(status   !== "all" ? { status   } : {}),
      },
      include: { contract: true },
      orderBy:
        sort === "name"        ? { name: "asc" }          :
        sort === "utilization" ? { activeSeats: "desc" }  :
        sort === "seats"       ? { totalSeats: "desc" }   :
        { monthlySpend: "desc" },
    });

    return NextResponse.json(apps);
  } catch {
    return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireSession();
    const body    = await req.json();

    const app = await db.saasApp.create({
      data: {
        orgId:        session.orgId,
        name:         body.name,
        category:     body.category ?? "other",
        monthlySpend: body.monthlySpend ?? 0,
        annualSpend:  (body.monthlySpend ?? 0) * 12,
        totalSeats:   body.totalSeats  ?? 0,
        activeSeats:  body.activeSeats ?? 0,
        source:       "manual",
        status:       "active",
      },
    });

    return NextResponse.json(app, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
