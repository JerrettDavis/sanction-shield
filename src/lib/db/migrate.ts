import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";

/**
 * Production migration runner for Supabase PostgreSQL.
 *
 * Strategy:
 * 1. Check if migrations table exists
 * 2. Acquire advisory lock (pg_advisory_xact_lock) to prevent concurrent runs
 * 3. Execute pending migrations in order
 * 4. Release lock on completion
 *
 * Migrations are idempotent SQL files in supabase/migrations/.
 * Each migration is tracked by filename in a `_migrations` table.
 */

let _migrated = false;

export async function ensureMigrated(): Promise<void> {
  if (_migrated) return;
  _migrated = true;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return;

  // Use the Postgres connection string if available for raw SQL
  const postgresUrl = process.env.POSTGRES_URL_NON_POOLING || process.env.POSTGRES_PRISMA_URL;

  if (!postgresUrl) {
    // No direct Postgres access — check tables via Supabase client
    const client = createClient(url, key);
    const { error } = await client.from("organizations").select("id").limit(1);

    if (error) {
      console.error(
        "[SanctionShield] Database tables not found and no POSTGRES_URL available for auto-migration.\n" +
          "  Please run migrations via Supabase SQL Editor:\n" +
          "  1. supabase/migrations/001_initial_schema.sql\n" +
          "  2. supabase/migrations/002_search_function.sql"
      );
    } else {
      console.log("[SanctionShield] Database migration check passed (tables exist).");
    }
    return;
  }

  // We have a direct Postgres URL — run migrations automatically
  console.log("[SanctionShield] Running database migrations...");

  try {
    // Dynamic import pg since it's only needed for migrations
    const { default: pg } = await import("pg");
    const client = new pg.Client({ connectionString: postgresUrl, ssl: { rejectUnauthorized: false } });
    await client.connect();

    // Create migrations tracking table
    await client.query(`
      CREATE TABLE IF NOT EXISTS _migrations (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `);

    // Acquire advisory lock (lock ID 42424242 — arbitrary but consistent)
    await client.query("SELECT pg_advisory_lock(42424242)");

    try {
      // Get applied migrations
      const { rows: applied } = await client.query("SELECT name FROM _migrations ORDER BY id");
      const appliedSet = new Set(applied.map((r: { name: string }) => r.name));

      // Read migration files
      const migrationsDir = path.join(process.cwd(), "supabase", "migrations");
      if (!fs.existsSync(migrationsDir)) {
        console.log("[SanctionShield] No migrations directory found, skipping.");
        return;
      }

      const files = fs.readdirSync(migrationsDir)
        .filter(f => f.endsWith(".sql"))
        .sort();

      let applied_count = 0;
      for (const file of files) {
        if (appliedSet.has(file)) continue;

        console.log(`[SanctionShield] Applying migration: ${file}`);
        const sql = fs.readFileSync(path.join(migrationsDir, file), "utf-8");

        await client.query("BEGIN");
        try {
          await client.query(sql);
          await client.query("INSERT INTO _migrations (name) VALUES ($1)", [file]);
          await client.query("COMMIT");
          applied_count++;
          console.log(`[SanctionShield] Applied: ${file}`);
        } catch (err) {
          await client.query("ROLLBACK");
          console.error(`[SanctionShield] Migration failed: ${file}`, err);
          throw err;
        }
      }

      if (applied_count === 0) {
        console.log("[SanctionShield] All migrations already applied.");
      } else {
        console.log(`[SanctionShield] Applied ${applied_count} migration(s).`);
      }
    } finally {
      // Release advisory lock
      await client.query("SELECT pg_advisory_unlock(42424242)");
      await client.end();
    }
  } catch (err) {
    console.error("[SanctionShield] Migration runner failed:", err);
    // Don't throw — let the app start and report via /api/ready
  }
}
