import "server-only";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { unwrap } from "@/lib/supabase/unwrap";
import type { ReviewItem } from "./types";

/** Whether the logged-in user is in app_admins (checked in SQL, never in user_metadata). */
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
 * Flagged organizations, newest first, as the admin themselves: admin_review_list() raises for anyone else.
 * The function returns no NIF and no email by design; this read keeps only the columns the page shows.
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
