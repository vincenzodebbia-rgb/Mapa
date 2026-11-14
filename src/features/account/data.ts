import "server-only";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { unwrap } from "@/lib/supabase/unwrap";
import type { ReviewItem } from "./types";

/**
 * "Descargar mis datos": tutto ciò che il database ha dell'utente e della sua realtà (export_my_data, letto come
 * l'utente stesso: la funzione usa auth.uid()). Mai in cache.
 */
export async function getMyDataExport(): Promise<unknown> {
  const supabase = await createSupabaseServerClient();
  return unwrap(await supabase.rpc("export_my_data"));
}

/** Il percorso del logo della propria realtà, se c'è: va tolto dallo Storage prima di eliminare l'account. */
export async function getOwnLogoPath(userId: string): Promise<string | null> {
  const supabase = await createSupabaseServerClient();
  const row = unwrap(
    await supabase.from("memberships").select("organization:organizations(logo_path)").eq("user_id", userId).maybeSingle(),
  );
  return row?.organization?.logo_path ?? null;
}

/** Se l'utente che ha fatto l'accesso è in app_admins (controllato in SQL, mai in user_metadata). */
export async function isCurrentUserAdmin(): Promise<boolean> {
  const supabase = await createSupabaseServerClient();
  return unwrap(await supabase.rpc("is_admin")) === true;
}

function toSafeHttpUrl(value: string | null): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : null;
  } catch {
    return null;
  }
}

/**
 * Organizzazioni con avviso, dalla più recente, lette come l'admin stesso: admin_review_list() dà errore per chiunque altro.
 * La funzione non restituisce né NIF né email per costruzione; questa lettura tiene solo le colonne che la pagina mostra.
 */
export async function getFlaggedOrganizations(): Promise<ReviewItem[]> {
  const supabase = await createSupabaseServerClient();
  const rows = unwrap(await supabase.rpc("admin_review_list")) ?? [];
  return rows
    .filter((row) => row.flagged_for_review)
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .map((row) => ({
      id: row.id,
      slug: row.slug,
      name: row.name,
      entityType: row.entity_type,
      venueActivity: row.venue_activity,
      neighborhoodName: row.neighborhood_name,
      contactUrl: toSafeHttpUrl(row.contact_url),
      whatForWhom: row.what_for_whom,
      howSustained: row.how_sustained,
      whatTheyOffer: row.what_they_offer,
      flagReason: row.flag_reason,
      status: row.status,
      createdAt: row.created_at,
    }));
}
