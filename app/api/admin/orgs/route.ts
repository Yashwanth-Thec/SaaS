import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { db } from "@/lib/db";

// PATCH /api/admin/orgs — update org status or plan
export async function PATCH(req: NextRequest) {
  const session = await requireSession();
  if (session.role !== "owner") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const { orgId, status, plan } = body as { orgId: string; status?: string; plan?: string };

  if (!orgId) return NextResponse.json({ error: "orgId required" }, { status: 400 });

  const validStatuses = ["pending", "active", "suspended"];
  const validPlans    = ["starter", "growth", "enterprise"];

  if (status && !validStatuses.includes(status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }
  if (plan && !validPlans.includes(plan)) {
    return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
  }

  // Prevent owner from suspending their own org
  const user = await db.user.findUnique({ where: { id: session.userId }, select: { orgId: true } });
  if (user?.orgId === orgId && status) {
    return NextResponse.json({ error: "Cannot change your own org status" }, { status: 400 });
  }

  const updated = await db.organization.update({
    where: { id: orgId },
    data: {
      ...(status ? { status } : {}),
      ...(plan   ? { plan   } : {}),
    },
    select: { id: true, status: true, plan: true, name: true },
  });

  return NextResponse.json(updated);
}
