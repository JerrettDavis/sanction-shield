import type { DbAdapter } from "./adapter";
import { isProductionMode } from "./adapter";

let _adapter: DbAdapter | null = null;
let _initialized = false;

/**
 * Get the database adapter. Auto-detects environment:
 * - Production (SUPABASE_URL set): Supabase PostgreSQL
 * - Local dev (no env): SQLite in ./data/sanctionshield.db
 */
export async function getDb(): Promise<DbAdapter> {
  if (!_adapter) {
    if (isProductionMode()) {
      // Dynamic import to avoid loading Supabase client in local dev
      const { SupabaseAdapter } = await import("./supabase-adapter");
      _adapter = new SupabaseAdapter();
    } else {
      const { SqliteAdapter } = await import("./sqlite");
      _adapter = new SqliteAdapter();
    }
  }

  if (!_initialized) {
    await _adapter.initialize();
    _initialized = true;
  }

  return _adapter;
}
