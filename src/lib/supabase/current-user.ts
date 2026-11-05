import "server-only";
import { connection } from "next/server";
import { createSupabaseServerClient } from "./server";

/**
 * Id dell'utente che ha fatto l'accesso, oppure null. getClaims() verifica la firma del JWT (sul server mai fidarsi di
 * getSession()). Pagine e action la chiamano da sole: il proxy aggiorna solo il cookie, non è un'autorizzazione.
 */
export async function getCurrentUserId(): Promise<string | null> {
  // La sessione appartiene a una richiesta: mai dentro un guscio prerenderizzato (Cache Components). Senza questa riga
  // il prerender di sviluppo delle pagine private arriva a chiamate Supabase che leggono l'orologio e fallisce.
  await connection();
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.getClaims();
  if (error || !data) return null;
  const subject = data.claims.sub;
  return typeof subject === "string" && subject.length > 0 ? subject : null;
}
