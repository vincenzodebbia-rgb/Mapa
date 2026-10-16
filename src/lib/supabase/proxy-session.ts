import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getPublicEnv } from "@/lib/env";

/**
 * Refreshes the Supabase auth cookie on every request, so Server Components see a valid session.
 * This is NOT authorization: pages and actions re-check the user themselves.
 */
export async function refreshSession(request: NextRequest): Promise<NextResponse> {
  const env = getPublicEnv();
  let response = NextResponse.next({ request });

  const supabase = createServerClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        // No-cache headers: a CDN must never serve one user's refreshed session to someone else.
        Object.entries(headers).forEach(([key, value]) => response.headers.set(key, value));
      },
    },
  });

  // getClaims() validates the JWT and refreshes it when expired. A failure just means "anonymous".
  const { error } = await supabase.auth.getClaims();
  if (error) {
    console.warn("Session refresh failed:", error.name);
  }

  return response;
}
