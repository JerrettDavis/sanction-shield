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
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  if (job.org_id !== auth.orgId) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  if (job.status !== "complete") {
    return NextResponse.json(
      { error: "not_ready", message: `Batch status: ${job.status}` },
      { status: 409 }
    );
  }

  const results = await db.getBatchResults(id);

  // Check format preference
  const format = req.nextUrl.searchParams.get("format") || "csv";

  if (format === "json") {
    return NextResponse.json({ batch_id: id, results });
  }

  // CSV format
  const headers = ["input_name", "decision", "confidence", "band", "matched_name", "matched_list", "matched_id", "programs", "reason_codes"];
  const csvLines = [headers.join(",")];

  for (const r of results) {
    csvLines.push([
      `"${(r.input_name || "").replace(/"/g, '""')}"`,
      r.decision,
      r.confidence ?? "",
      r.band ?? "",
      `"${(r.matched_name || "").replace(/"/g, '""')}"`,
      r.matched_list ?? "",
      r.matched_id ?? "",
      `"${(r.programs || []).join("; ")}"`,
      `"${(r.reason_codes || []).join("; ")}"`,
    ].join(","));
  }

  return new NextResponse(csvLines.join("\n"), {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="batch-${id}-results.csv"`,
    },
  });
}
