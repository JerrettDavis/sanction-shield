import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { isProductionMode } from "@/lib/db/adapter";

/**
 * Create a Supabase client for server-side use with cookie-based auth.
 * Used in Server Components and Route Handlers for session management.
 */
export async function createAuthClient() {
  if (!isProductionMode()) {
    return null; // Local dev doesn't use Supabase Auth
  }

  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Cookies can't be set in Server Components — only in Route Handlers/Actions
          }
        },
      },
    }
  );
}

/**
 * Get the current authenticated user session.
 * Returns null if not authenticated or in local dev mode.
 */
export async function getSession() {
  const client = await createAuthClient();
  if (!client) return null;

  const { data: { user }, error } = await client.auth.getUser();
  if (error || !user) return null;

  return user;
}

/**
 * Get the current user's org_id from user_profiles.
 * Returns null if not found.
 */
export async function getUserOrg() {
  const client = await createAuthClient();
  if (!client) return null;

  const { data: { user } } = await client.auth.getUser();
  if (!user) return null;

  const { data: profile } = await client
    .from("user_profiles")
    .select("org_id, role")
    .eq("id", user.id)
    .maybeSingle();

  return profile;
}
