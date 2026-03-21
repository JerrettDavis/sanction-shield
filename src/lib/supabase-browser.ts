import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let _client: SupabaseClient | null = null;

/**
 * Singleton Supabase client for browser/client components.
 * Returns null if Supabase env vars aren't set (local dev mode).
 * MUST be a singleton to avoid "Multiple GoTrueClient instances" errors.
 */
export function getSupabaseBrowser(): SupabaseClient | null {
  if (typeof window === "undefined") return null;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;

  if (!_client) {
    _client = createClient(url, key);
  }

  return _client;
}
