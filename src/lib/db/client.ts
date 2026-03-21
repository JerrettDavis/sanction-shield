import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

/** Browser/client-side Supabase client (uses anon key + RLS) */
export function createBrowserClient() {
  return createClient(supabaseUrl, supabaseAnonKey);
}

/** Server-side Supabase client (bypasses RLS — use for admin operations only) */
export function createServiceClient() {
  return createClient(supabaseUrl, supabaseServiceKey);
}
