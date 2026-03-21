import { NextRequest, NextResponse } from "next/server";
import { updateSanctionsLists } from "@/lib/sanctions/updater";
import { createServiceClient } from "@/lib/db/client";

/**
 * Cron endpoint for daily sanctions list updates.
 * Protected by CRON_SECRET to prevent unauthorized triggers.
 * Configure in vercel.json: { "crons": [{ "path": "/api/cron/update-lists", "schedule": "0 6 * * *" }] }
 */
export async function GET(req: NextRequest) {
  // Verify cron secret
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const startTime = Date.now();

  try {
    const results = await updateSanctionsLists();
    const duration = Date.now() - startTime;

    // Log the update event
    const supabase = createServiceClient();
    await supabase.from("audit_log").insert({
      org_id: null as unknown as string, // System-level event
      event_type: "system.list_update",
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
