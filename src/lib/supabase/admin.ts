import "server-only";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import { getPublicEnv } from "@/lib/env";
import { getServerEnv } from "@/lib/server-env";

/**
 * Client Supabase con la chiave SECRET: salta la RLS. Solo per lavori fidati sul server (limiti di frequenza,
 * elenco del Comune, cache della geocodifica, eliminazione dell'account). Mai per servire i dati di una richiesta utente.
 */
export function createSupabaseAdminClient() {
  return createClient<Database>(getPublicEnv().NEXT_PUBLIC_SUPABASE_URL, getServerEnv().SUPABASE_SECRET_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
