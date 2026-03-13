import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireSession } from "@/lib/auth";
import { db } from "@/lib/db";
import type { OffboardingStep } from "@/lib/offboarding";
import { calcProgress } from "@/lib/offboarding";

const schema = z.object({
  stepId: z.string(),
  status: z.enum(["pending", "done", "skipped", "failed"]),
  notes:  z.string().optional(),
});

/**
 * PATCH /api/offboarding/[id]/step
 * Update the status of a single step within the offboarding.
 * Auto-completes the entire offboarding when all steps are done/skipped.
 */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireSession();
    const { id }  = await params;
    const body    = await req.json();
    const { stepId, status, notes } = schema.parse(body);

    const offboarding = await db.offboarding.findFirst({
      where: { id, orgId: session.orgId },
    });
    if (!offboarding) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const steps = JSON.parse(offboarding.steps) as OffboardingStep[];
    const idx   = steps.findIndex((s) => s.id === stepId);
    if (idx === -1) return NextResponse.json({ error: "Step not found" }, { status: 404 });

    steps[idx] = {
      ...steps[idx],
      status,
      notes:       notes ?? steps[idx].notes,
      completedAt: status === "done" || status === "skipped" ? new Date().toISOString() : null,
    };

    // If step is "revoke_access" + done → deactivate that app access
    if (status === "done" && steps[idx].type === "revoke_access" && steps[idx].appId) {
      const employee = await db.employee.findUnique({
        where: { id: offboarding.employeeId },
      });
      if (employee) {
        await db.appAccess.updateMany({
          where: { employeeId: employee.id, appId: steps[idx].appId },
          data:  { isActive: false },
        });
        // Decrement active seat count on the app
        await db.saasApp.update({
          where: { id: steps[idx].appId },
          data:  { activeSeats: { decrement: 1 } },
        }).catch(() => {}); // ignore if already 0
      }
    }

    const progress = calcProgress(steps);

    const updated = await db.offboarding.update({
      where: { id },
      data: {
        steps:       JSON.stringify(steps),
        status:      progress.isComplete ? "completed" : "in_progress",
        completedAt: progress.isComplete ? new Date() : null,
      },
    });

    return NextResponse.json({ offboarding: updated, progress });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.issues[0]?.message }, { status: 400 });
    }
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }
}
