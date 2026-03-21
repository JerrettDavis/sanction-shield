import { NextRequest, NextResponse } from "next/server";
import { validateApiKey } from "@/lib/auth/middleware";
import { getDb } from "@/lib/db";
import { parseCSV, processBatch } from "@/lib/services/batch";

const MAX_ROWS = 5000;

export async function POST(req: NextRequest) {
  const auth = await validateApiKey(req);
  if (auth instanceof NextResponse) return auth;

  // Parse multipart form data
  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  const threshold = parseInt(formData.get("threshold") as string) || 80;

  if (!file) {
    return NextResponse.json(
      { error: "missing_file", message: "CSV file is required" },
      { status: 400 }
    );
  }

  if (!file.name.endsWith(".csv")) {
    return NextResponse.json(
      { error: "invalid_file", message: "File must be a CSV" },
      { status: 400 }
    );
  }

  const csvText = await file.text();
  const rows = parseCSV(csvText);

  if (rows.length === 0) {
    return NextResponse.json(
      { error: "empty_file", message: "CSV contains no data rows" },
      { status: 400 }
    );
  }

  if (rows.length > MAX_ROWS) {
    return NextResponse.json(
      { error: "too_many_rows", message: `Maximum ${MAX_ROWS} rows per batch. Got ${rows.length}.` },
      { status: 400 }
    );
  }

  const db = await getDb();
  const batchId = await db.createBatchJob({
    orgId: auth.orgId,
    totalNames: rows.length,
    threshold,
  });

  // Process in background (don't await — return immediately)
  processBatch({
    batchId,
    orgId: auth.orgId,
    rows,
    threshold,
    lists: ["ofac_sdn", "eu_consolidated", "un_security_council"],
  }).catch(err => {
    console.error(`[Batch ${batchId}] Processing failed:`, err);
    db.updateBatchJob(batchId, { status: "failed" });
  });

  await db.insertAuditLog({
    orgId: auth.orgId,
    eventType: "screening.batch_created",
    actorId: auth.apiKeyId,
    details: { batch_id: batchId, total_names: rows.length, threshold },
  });

  return NextResponse.json({
    batch_id: batchId,
    status: "processing",
    total_names: rows.length,
    created_at: new Date().toISOString(),
  }, { status: 202 });
}
