import "server-only";
import { createHmac } from "node:crypto";
import { headers } from "next/headers";
import { createSupabaseAdminClient } from "./supabase/admin";
import { unwrap } from "./supabase/unwrap";
import { getServerEnv } from "./server-env";

/**
 * Rate limits on top of public.check_rate_limit (service_role only, hence the admin client).
 * Keys never hold personal data in clear: an IP or an email becomes an HMAC with a salt that changes every day
 * (UTC), derived from the secret key. Nobody can reverse it, and yesterday's keys cannot be linked to today's.
 */

/** HMAC-SHA256 of `value` with a daily salt. Pure, for tests. */
export function hashForRateLimit(value: string, secret: string, day: string): string {
  return createHmac("sha256", secret).update(`${day}|${value.trim().toLowerCase()}`).digest("hex");
}

function todayUtc(now = new Date()): string {
  return now.toISOString().slice(0, 10);
}

/** First address of x-forwarded-for (set by Vercel), else x-real-ip. Pure, for tests. */
export function readClientIp(headerList: Pick<Headers, "get">): string {
  const forwarded = headerList.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || headerList.get("x-real-ip")?.trim() || "unknown";
}

/** Rate-limit key for this connection: `<scope>:ip:<hmac>`. The IP itself is never stored or logged. */
export async function getConnectionKey(scope: string): Promise<string> {
  const ip = readClientIp(await headers());
  return `${scope}:ip:${hashForRateLimit(ip, getServerEnv().SUPABASE_SECRET_KEY, todayUtc())}`;
}

/** Rate-limit key for a personal value such as an email: `<scope>:h:<hmac>`. */
export function getHashedKey(scope: string, value: string): string {
  return `${scope}:h:${hashForRateLimit(value, getServerEnv().SUPABASE_SECRET_KEY, todayUtc())}`;
}

/** Rate-limit key for something that is not personal (a user id, an organization id). */
export function getIdKey(scope: string, id: string): string {
  return `${scope}:id:${id}`;
}

/**
 * Counts one attempt and says whether it is still within `max` per `window` (a Postgres interval, e.g. '1 hour').
 * Throws if the database fails: the caller answers with a generic error, never lets the attempt through silently.
 */
export async function isWithinRateLimit(key: string, max: number, window: string): Promise<boolean> {
  const supabase = createSupabaseAdminClient();
  // null would mean "no answer": treat it as over the limit (fail closed).
  return unwrap(await supabase.rpc("check_rate_limit", { p_key: key, p_max: max, p_window: window })) === true;
}
