import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { generateOffboardingSteps } from "@/lib/offboarding";

export async function GET() {
  try {
    const session = await requireSession();

    const offboardings = await db.offboarding.findMany({
      where:   { orgId: session.orgId },
      include: {
        employee:  { select: { id: true, name: true, email: true, department: true, jobTitle: true } },
        createdBy: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(offboardings);
  } catch {
    return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  }
}

const schema = z.object({
  employeeId: z.string(),
  notes:      z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const session = await requireSession();
    const body    = await req.json();
    const { employeeId, notes } = schema.parse(body);

    // Verify employee belongs to org
    const employee = await db.employee.findFirst({
      where: { id: employeeId, orgId: session.orgId },
    });
    if (!employee) {
      return NextResponse.json({ error: "Employee not found" }, { status: 404 });
    }

    // Check no active offboarding already running
    const existing = await db.offboarding.findUnique({
      where: { employeeId },
    });
    if (existing && existing.status !== "completed" && existing.status !== "failed") {
      return NextResponse.json({ error: "An offboarding is already in progress for this employee" }, { status: 409 });
    }

    // Get all app access for this employee
    const appAccess = await db.appAccess.findMany({
      where:   { employeeId, isActive: true },
      include: {
        app: {
          select: { id: true, name: true, category: true, monthlySpend: true, totalSeats: true },
        },
      },
    });

    const steps = generateOffboardingSteps(
      { name: employee.name, email: employee.email },
      appAccess.map((a) => ({
        appId:        a.app.id,
        appName:      a.app.name,
        category:     a.app.category,
        monthlySpend: a.app.monthlySpend,
        totalSeats:   a.app.totalSeats,
      }))
    );

    const offboarding = await db.offboarding.create({
      data: {
        orgId:      session.orgId,
        employeeId,
        createdById: session.userId,
        status:     "in_progress",
        steps:      JSON.stringify(steps),
        notes:      notes ?? null,
      },
      include: {
        employee:  { select: { id: true, name: true, email: true, department: true } },
        createdBy: { select: { id: true, name: true } },
      },
    });

    // Mark employee as being offboarded
    await db.employee.update({
      where: { id: employeeId },
      data:  { status: "offboarded" },
    });

    return NextResponse.json(offboarding, { status: 201 });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.issues[0]?.message }, { status: 400 });
    }
    console.error("[offboarding/create]", err);
    return NextResponse.json({ error: "Failed to create offboarding" }, { status: 500 });
  }
}
