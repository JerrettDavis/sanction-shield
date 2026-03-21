import { createClient } from "@supabase/supabase-js";

/**
 * Auto-migration check for Supabase PostgreSQL.
 * On first API request, checks if tables exist.
 * If tables are missing, logs migration instructions.
 *
 * Note: Supabase JS client doesn't support arbitrary DDL.
 * Full migrations must be applied via:
 * 1. Supabase SQL Editor (dashboard)
 * 2. supabase CLI: supabase db push
 * 3. GitHub Action with supabase/setup-cli
 *
 * The migration SQL lives in supabase/migrations/*.sql
 */

let _migrated = false;

/** Ensure migrations have run (called once per cold start) */
export async function ensureMigrated(): Promise<void> {
  if (_migrated) return;
  _migrated = true;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return;

  const client = createClient(url, key);

  // Check if core table exists
  const { error } = await client.from("organizations").select("id").limit(1);

  if (error) {
    console.error(
      "[SanctionShield] Database tables not found. Please run migrations:\n" +
        "  1. Go to Supabase Dashboard → SQL Editor\n" +
        "  2. Run: supabase/migrations/001_initial_schema.sql\n" +
        "  3. Run: supabase/migrations/002_search_function.sql\n" +
        "  Or use CLI: supabase db push"
    );
  } else {
    console.log("[SanctionShield] Database migration check passed.");
  }
}
