import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "@/lib/database.types";
import { getPublicEnv } from "@/lib/env";

/**
 * Aggiorna il cookie di accesso di Supabase a ogni richiesta, così i Server Component vedono una sessione valida.
 * NON è un'autorizzazione: pagine e action ricontrollano l'utente da sole.
 */
export async function refreshSession(request: NextRequest): Promise<NextResponse> {
  const env = getPublicEnv();
  let response = NextResponse.next({ request });

  const supabase = createServerClient<Database>(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        // Header no-cache: una CDN non deve mai servire a qualcun altro la sessione aggiornata di un utente.
        Object.entries(headers).forEach(([key, value]) => response.headers.set(key, value));
      },
    },
  });

  // getClaims() verifica il JWT e lo rinnova se è scaduto. Un fallimento vuol dire solo "anonimo".
  const { error } = await supabase.auth.getClaims();
  if (error) {
    console.warn("Session refresh failed:", error.name);
  }

  return response;
}
