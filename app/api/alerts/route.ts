import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const session = await requireSession();
    const { searchParams } = req.nextUrl;
    const unread = searchParams.get("unread") === "true";

    const alerts = await db.alert.findMany({
      where: {
        orgId: session.orgId,
        isDismissed: false,
        ...(unread ? { isRead: false } : {}),
      },
      orderBy: [
        { severity: "asc" }, // critical first (a < i < w alphabetically — not ideal but works)
        { createdAt: "desc" },
      ],
    });

    // Sort by severity weight manually
    const weight: Record<string, number> = { critical: 0, warning: 1, info: 2 };
    alerts.sort((a, b) => (weight[a.severity] ?? 3) - (weight[b.severity] ?? 3));

    return NextResponse.json(alerts);
  } catch {
    return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  }
}
