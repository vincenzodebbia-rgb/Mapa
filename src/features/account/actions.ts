"use server";

import { updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { EVENTS_TAG, ORGANIZATIONS_TAG } from "@/lib/cache-tags";
import { getHashedKey, isWithinRateLimit } from "@/lib/rate-limit";
import { getCurrentUserId } from "@/lib/supabase/current-user";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getOwnLogoPath } from "./data";
import { deleteConfirmationSchema } from "./schema";
import type { DeleteAccountState } from "./types";

const DELETE_ATTEMPTS_PER_USER_PER_HOUR = 5;

/**
 * "Eliminar cuenta" (docs/piani/sessione-7.md §5). Ordine: zod (la parola ELIMINAR) → utente → limite → file di Storage
 * della realtà (il logo, con il client dell'utente e la policy di org-logos) → delete_my_account() (elimina sempre la
 * realtà, i suoi eventi, risposte, NIF e vecchi slug, poi l'utente) → uscita → cache → home.
 */
export async function deleteAccount(previous: DeleteAccountState, formData: FormData): Promise<DeleteAccountState> {
  const attempt = previous.attempt + 1;
  if (!deleteConfirmationSchema.safeParse(formData.get("confirm")).success) return { attempt, error: "wrongWord" };

  const userId = await getCurrentUserId();
  if (!userId) redirect("/entrar");

  const supabase = await createSupabaseServerClient();
  try {
    if (!(await isWithinRateLimit(getHashedKey("delete-account", userId), DELETE_ATTEMPTS_PER_USER_PER_HOUR, "1 hour"))) {
      return { attempt, error: "tooMany" };
    }
    // Prima i file: dopo, senza membership, la policy di Storage non lascerebbe più cancellarli.
    const logoPath = await getOwnLogoPath(userId);
    if (logoPath) {
      const { error: storageError } = await supabase.storage.from("org-logos").remove([logoPath]);
      if (storageError) {
        console.warn("Logo removal failed:", storageError.name);
        return { attempt, error: "failed" };
      }
    }
    const { error } = await supabase.rpc("delete_my_account");
    if (error) {
      console.warn("delete_my_account failed:", error.code);
      return { attempt, error: "failed" };
    }
  } catch {
    return { attempt, error: "failed" };
  }

  // L'utente non esiste più: si tolgono i cookie di sessione. Un errore qui non cambia niente (la sessione è già invalida).
  const { error: signOutError } = await supabase.auth.signOut();
  if (signOutError) console.warn("signOut after delete failed:", signOutError.code ?? signOutError.name);

  // La scheda, le pagine dei barrios, la mappa e le pagine evento non devono mostrare più niente della realtà.
  updateTag(ORGANIZATIONS_TAG);
  updateTag(EVENTS_TAG);
  redirect("/");
}
