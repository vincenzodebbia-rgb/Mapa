import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/lib/database.types";
import { getPublicEnv } from "@/lib/env";

/** Supabase client for Client Components. Uses only the publishable key; RLS decides what it can read. */
export function createSupabaseBrowserClient() {
  const env = getPublicEnv();
  return createBrowserClient<Database>(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY);
}
