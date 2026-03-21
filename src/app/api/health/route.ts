import { NextResponse } from "next/server";
import { validateEnv } from "@/lib/env";

/**
 * Liveness probe — is the app process running and responsive?
 * Always returns 200 if the process is alive.
 */
export async function GET() {
  const env = validateEnv();

  const health = {
    status: "ok",
    timestamp: new Date().toISOString(),
    version: "0.1.0",
    environment: env.isProduction ? "production" : "local",
    uptime_seconds: Math.floor(process.uptime()),
  };

  return NextResponse.json(health);
}
