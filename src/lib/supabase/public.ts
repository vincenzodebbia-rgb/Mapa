import "server-only";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import { getPublicEnv } from "@/lib/env";

/**
 * Supabase client for PUBLIC pages, acting as `anon`: no cookies, no session, so it works inside `'use cache'`
 * (cookies() is not allowed there) and every visitor gets the same, cacheable answer. RLS shows exactly what
 * the public may see (no suspended organizations, no private columns).
 * Never use it for anything a logged-in user must see as themselves: use createSupabaseServerClient().
 */
export function createSupabasePublicClient() {
  const env = getPublicEnv();
  return createClient<Database>(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}

/** Public URL of a file in a public Storage bucket (org-logos). The path comes from the database. */
export function getPublicStorageUrl(bucket: string, path: string): string {
  const base = getPublicEnv().NEXT_PUBLIC_SUPABASE_URL.replace(/\/+$/, "");
  return `${base}/storage/v1/object/public/${encodeURIComponent(bucket)}/${path.split("/").map(encodeURIComponent).join("/")}`;
}
