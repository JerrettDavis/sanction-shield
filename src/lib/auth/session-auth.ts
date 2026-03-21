import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

interface SessionAuthResult {
  orgId: string;
  userId: string;
}

/**
 * Validate a user session from cookies (for dashboard API calls).
 * Used when no Bearer token is provided — authenticates via the
 * Supabase session cookie set by @supabase/ssr's browser client.
 */
export async function validateSession(_req: NextRequest): Promise<SessionAuthResult | NextResponse> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    // Local dev — return a default org
    return { orgId: "local-dev-org", userId: "local-dev-user" };
  }

  const cookieStore = await cookies();
  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll() {
        // Read-only in route handlers for auth validation
      },
    },
  });

  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    return NextResponse.json(
      { error: "unauthorized", message: "Not authenticated. Please log in." },
      { status: 401 }
    );
  }

  // Get user's org
  const { data: profile } = await supabase
    .from("user_profiles")
    .select("org_id")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile?.org_id) {
    return NextResponse.json(
      { error: "no_organization", message: "User has no organization. Please contact support." },
      { status: 403 }
    );
  }

  return { orgId: profile.org_id, userId: user.id };
}
