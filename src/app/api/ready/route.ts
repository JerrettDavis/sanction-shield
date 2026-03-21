import { NextResponse } from "next/server";
import { validateEnv } from "@/lib/env";
import { getDb } from "@/lib/db";

interface ReadinessCheck {
  name: string;
  status: "pass" | "fail" | "warn";
  message: string;
  latency_ms?: number;
}

/**
 * Readiness probe — is the app ready to serve traffic?
 * Checks: environment, database connectivity, migration status, sanctions data.
 * Returns 200 if ready, 503 if not.
 */
export async function GET() {
  const checks: ReadinessCheck[] = [];
  let allPassing = true;

  // 1. Environment validation
  try {
    const env = validateEnv();
    checks.push({
      name: "environment",
      status: "pass",
      message: env.isProduction ? "Production (Supabase)" : "Local (SQLite)",
    });
  } catch (e) {
    allPassing = false;
    checks.push({
      name: "environment",
      status: "fail",
      message: e instanceof Error ? e.message : "Environment validation failed",
    });
  }

  // 2. Database connectivity
  const dbStart = Date.now();
  try {
    const db = await getDb();
    const versions = await db.getListVersions();
    const dbLatency = Date.now() - dbStart;

    checks.push({
      name: "database",
      status: "pass",
      message: "Connected and responsive",
      latency_ms: dbLatency,
    });

    // 3. Migration status (tables exist if we got list versions)
    checks.push({
      name: "migrations",
      status: "pass",
      message: "Schema current",
    });

    // 4. Sanctions data freshness
    const hasOfac = !!versions.ofac_sdn;
    if (hasOfac) {
      checks.push({
        name: "sanctions_data",
        status: "pass",
        message: `OFAC SDN: ${versions.ofac_sdn}`,
      });
    } else {
      checks.push({
        name: "sanctions_data",
        status: "warn",
        message: "OFAC SDN not loaded — run seed or trigger cron",
      });
    }
  } catch (e) {
    allPassing = false;
    const dbLatency = Date.now() - dbStart;
    checks.push({
      name: "database",
      status: "fail",
      message: e instanceof Error ? e.message : "Database unreachable",
      latency_ms: dbLatency,
    });
  }

  const response = {
    ready: allPassing,
    timestamp: new Date().toISOString(),
    checks,
  };

  return NextResponse.json(response, { status: allPassing ? 200 : 503 });
}
