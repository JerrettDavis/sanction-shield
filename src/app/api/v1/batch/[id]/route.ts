import { NextRequest, NextResponse } from "next/server";
import { validateApiKey } from "@/lib/auth/middleware";
import { getDb } from "@/lib/db";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await validateApiKey(req);
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  const db = await getDb();
  const job = await db.getBatchJob(id);

  if (!job) {
    return NextResponse.json(
      { error: "not_found", message: "Batch job not found" },
      { status: 404 }
    );
  }

  if (job.org_id !== auth.orgId) {
    return NextResponse.json(
      { error: "forbidden", message: "Access denied" },
      { status: 403 }
    );
  }

  const response: Record<string, unknown> = {
    batch_id: job.id,
    status: job.status,
    total_names: job.total_names,
    processed: job.processed,
    matches_found: job.matches_found,
    progress_pct: job.total_names > 0 ? Math.round((job.processed / job.total_names) * 100) : 0,
  };

  if (job.status === "complete") {
    response.completed_at = job.completed_at;
    response.summary = {
      total: job.total_names,
      processed: job.processed,
      matches: job.matches_found,
      clean: job.processed - job.matches_found,
    };
    response.results_url = `/api/v1/batch/${id}/download`;
  }

  return NextResponse.json(response);
}
