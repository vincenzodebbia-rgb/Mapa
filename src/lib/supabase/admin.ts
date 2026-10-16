import "server-only";
import { createClient } from "@supabase/supabase-js";
import { getPublicEnv } from "@/lib/env";
import { getServerEnv } from "@/lib/server-env";

/**
 * Supabase client with the SECRET key: bypasses RLS. Only for trusted server jobs
 * (registry import, account deletion). Never use it to serve a user's request data.
 */
export function createSupabaseAdminClient() {
  return createClient(getPublicEnv().NEXT_PUBLIC_SUPABASE_URL, getServerEnv().SUPABASE_SECRET_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
