import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "@/lib/database.types";
import { getPublicEnv } from "@/lib/env";

/**
 * Client Supabase per Server Component, Server Action e Route Handler, come l'utente attuale.
 * Uno per richiesta. L'utente si controlla con `auth.getClaims()`, mai con `auth.getSession()`.
 */
export async function createSupabaseServerClient() {
  const cookieStore = await cookies();
  const env = getPublicEnv();

  return createServerClient<Database>(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // I Server Component non possono scrivere cookie. Si può ignorare: src/proxy.ts aggiorna la sessione.
        }
      },
    },
  });
}
