import { NextRequest, NextResponse } from "next/server";
import { updateSanctionsLists } from "@/lib/sanctions/updater";
import { getDb } from "@/lib/db";

/**
 * Admin endpoint to trigger sanctions list ingestion.
 * Accepts either CRON_SECRET or SUPABASE_SERVICE_ROLE_KEY for auth.
 * This allows the seed to be triggered without knowing the CRON_SECRET.
 *
 * GET /api/admin/seed-lists
 */
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const token = authHeader?.replace("Bearer ", "");

  const validTokens = [
    process.env.CRON_SECRET,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
  ].filter(Boolean);

  if (!token || !validTokens.includes(token)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const startTime = Date.now();

  try {
    const results = await updateSanctionsLists();
    const duration = Date.now() - startTime;

    // Update list counts
    const db = await getDb();
    await db.insertAuditLog({
      orgId: "system",
      eventType: "system.seed_lists",
      details: { results, duration_ms: duration },
    });

    return NextResponse.json({
      success: true,
      results,
      duration_ms: duration,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
