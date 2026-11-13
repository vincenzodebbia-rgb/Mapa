import "server-only";
import { createHmac } from "node:crypto";
import { headers } from "next/headers";
import { createSupabaseAdminClient } from "./supabase/admin";
import { unwrap } from "./supabase/unwrap";
import { getServerEnv } from "./server-env";

/**
 * Limiti di frequenza sopra public.check_rate_limit (solo service_role, per questo il client admin).
 * Le chiavi non contengono mai dati personali in chiaro: un IP, un'email o un id utente diventano un HMAC con un sale
 * che cambia ogni giorno (UTC), ricavato dalla chiave secret. Nessuno può risalire al valore, e le chiavi di ieri non si
 * possono collegare a quelle di oggi.
 */

/** HMAC-SHA256 di `value` con un sale giornaliero. Pura, per i test. */
export function hashForRateLimit(value: string, secret: string, day: string): string {
  return createHmac("sha256", secret).update(`${day}|${value.trim().toLowerCase()}`).digest("hex");
}

function todayUtc(now = new Date()): string {
  return now.toISOString().slice(0, 10);
}

/** Primo indirizzo di x-forwarded-for (lo imposta Vercel), altrimenti x-real-ip. Pura, per i test. */
export function readClientIp(headerList: Pick<Headers, "get">): string {
  const forwarded = headerList.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || headerList.get("x-real-ip")?.trim() || "unknown";
}

/** Chiave del limite per questa connessione: `<ambito>:ip:<hmac>`. L'IP non si salva né si scrive mai nei log. */
export async function getConnectionKey(scope: string): Promise<string> {
  const ip = readClientIp(await headers());
  return `${scope}:ip:${hashForRateLimit(ip, getServerEnv().SUPABASE_SECRET_KEY, todayUtc())}`;
}

/** Chiave del limite per un valore personale (un'email, un id utente): `<ambito>:h:<hmac>`. */
export function getHashedKey(scope: string, value: string): string {
  return `${scope}:h:${hashForRateLimit(value, getServerEnv().SUPABASE_SECRET_KEY, todayUtc())}`;
}

/** Chiave del limite per qualcosa che non è personale (un id di organizzazione). Mai un id utente: usare getHashedKey. */
export function getIdKey(scope: string, id: string): string {
  return `${scope}:id:${id}`;
}

/**
 * Conta un tentativo e dice se si è ancora entro `max` per `window` (un intervallo di Postgres, per esempio '1 hour').
 * Lancia un errore se il database fallisce: chi chiama risponde con un errore generico, non lascia mai passare in silenzio.
 */
export async function isWithinRateLimit(key: string, max: number, window: string): Promise<boolean> {
  const supabase = createSupabaseAdminClient();
  // null vorrebbe dire "nessuna risposta": si tratta come limite superato (si chiude per sicurezza).
  return unwrap(await supabase.rpc("check_rate_limit", { p_key: key, p_max: max, p_window: window })) === true;
}
