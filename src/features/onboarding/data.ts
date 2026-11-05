import "server-only";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { unwrap } from "@/lib/supabase/unwrap";

/** Whether the logged-in user already manages an organization (v1: one per user). RLS: own memberships only. */
export async function hasOrganization(userId: string): Promise<boolean> {
  const supabase = await createSupabaseServerClient();
  const row = unwrap(
    await supabase.from("memberships").select("organization_id").eq("user_id", userId).limit(1).maybeSingle(),
  );
  return row !== null;
}
