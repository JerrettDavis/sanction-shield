import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Middleware for auth guards on dashboard routes.
 * Redirects unauthenticated users to /login.
 * Allows public routes (/login, /register, /api/*, /, etc.) through.
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Public routes — no auth required
  const publicPaths = ["/", "/login", "/register", "/forgot-password", "/api/"];
  if (publicPaths.some(p => pathname === p || pathname.startsWith("/api/"))) {
    return NextResponse.next();
  }

  // Skip auth guard in local dev mode (no Supabase)
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return NextResponse.next();
  }

  // Create Supabase client with request cookies
  let response = NextResponse.next({ request });
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Check auth
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return response;
}

export const config = {
  matcher: [
    // Match all dashboard routes (not API, not static assets)
    "/((?!_next/static|_next/image|favicon.ico|api/).*)",
  ],
};
