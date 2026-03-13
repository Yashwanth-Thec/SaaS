import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { parseCsv } from "@/lib/integrations/csv";
import { runSync } from "@/lib/integrations/sync-engine";
import { db } from "@/lib/db";

/**
 * POST /api/integrations/csv
 * Accepts a multipart CSV file upload and processes it.
 * Auto-detects format: bank_statement | app_inventory | employee_list
 */
export async function POST(req: NextRequest) {
  try {
    const session = await requireSession();
    const { orgId } = session;

    const formData = await req.formData();
    const file = formData.get("file");

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (!file.name.endsWith(".csv")) {
      return NextResponse.json({ error: "File must be a .csv" }, { status: 400 });
    }

    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: "File too large (max 10 MB)" }, { status: 400 });
    }

    const text   = await file.text();
    const parsed = parseCsv(text);

    if (parsed.format === "unknown") {
      return NextResponse.json(
        { error: parsed.errors[0] ?? "Unrecognized CSV format", format: "unknown" },
        { status: 422 }
      );
    }

    if (parsed.errors.length > 0 && parsed.rowCount === 0) {
      return NextResponse.json({ error: parsed.errors[0] }, { status: 422 });
    }

    // Track CSV integration record
    await db.integration.upsert({
      where:  { orgId_type: { orgId, type: "csv" } },
      update: { status: "syncing", lastError: null },
      create: { orgId, type: "csv", name: "CSV Import", status: "syncing" },
    });

    const result = await runSync(orgId, {
      employees: parsed.employees,
      apps:      parsed.apps,
      spend:     parsed.spend,
    });

    await db.integration.update({
      where: { orgId_type: { orgId, type: "csv" } },
      data: {
        status:    "connected",
        lastSyncAt: new Date(),
        syncCount: { increment: 1 },
        lastError: null,
      },
    });

    return NextResponse.json({
      ok:       true,
      format:   parsed.format,
      rowCount: parsed.rowCount,
      result,
      warnings: parsed.errors,
    });
  } catch (err) {
    console.error("[csv]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Import failed" },
      { status: 500 }
    );
  }
}
