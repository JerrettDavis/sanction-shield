import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

let _client: SupabaseClient | null = null;

/**
 * Singleton Supabase client for browser/client components.
 * Uses @supabase/ssr's createBrowserClient which stores auth tokens
 * in cookies (not localStorage), ensuring the server middleware
 * can read the session on subsequent requests.
 *
 * Returns null if Supabase env vars aren't set (local dev mode).
 */
export function getSupabaseBrowser(): SupabaseClient | null {
  if (typeof window === "undefined") return null;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;

  if (!_client) {
    _client = createBrowserClient(url, key);
  }

  return _client;
}
