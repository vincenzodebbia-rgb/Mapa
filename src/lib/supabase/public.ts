import "server-only";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import { getPublicEnv } from "@/lib/env";

/**
 * Client Supabase per le pagine PUBBLICHE, come `anon`: niente cookie, niente sessione, così funziona dentro
 * `'use cache'` (lì cookies() non è ammesso) e ogni visitatore riceve la stessa risposta, che si può mettere in cache.
 * La RLS mostra esattamente ciò che il pubblico può vedere (niente organizzazioni sospese, niente colonne private).
 * Mai per qualcosa che un utente con accesso deve vedere come sé stesso: usare createSupabaseServerClient().
 */
export function createSupabasePublicClient() {
  const env = getPublicEnv();
  return createClient<Database>(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}

/** URL pubblico di un file in un bucket pubblico dello Storage (org-logos). Il percorso viene dal database. */
export function getPublicStorageUrl(bucket: string, path: string): string {
  const base = getPublicEnv().NEXT_PUBLIC_SUPABASE_URL.replace(/\/+$/, "");
  return `${base}/storage/v1/object/public/${encodeURIComponent(bucket)}/${path.split("/").map(encodeURIComponent).join("/")}`;
}
