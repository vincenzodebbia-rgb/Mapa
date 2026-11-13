import "server-only";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { unwrap } from "@/lib/supabase/unwrap";

/** Se l'utente con accesso gestisce già un'organizzazione (v1: una per utente). RLS: solo le proprie membership. */
export async function hasOrganization(userId: string): Promise<boolean> {
  const supabase = await createSupabaseServerClient();
  const row = unwrap(
    await supabase.from("memberships").select("organization_id").eq("user_id", userId).limit(1).maybeSingle(),
  );
  return row !== null;
}
