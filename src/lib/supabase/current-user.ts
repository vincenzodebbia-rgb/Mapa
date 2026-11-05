import "server-only";
import { createSupabaseServerClient } from "./server";

/**
 * Id of the logged-in user, or null. getClaims() validates the JWT signature (never trust getSession() on the
 * server). Pages and actions call it themselves: the proxy only refreshes the cookie, it is not authorization.
 */
export async function getCurrentUserId(): Promise<string | null> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.getClaims();
  if (error || !data) return null;
  const subject = data.claims.sub;
  return typeof subject === "string" && subject.length > 0 ? subject : null;
}
