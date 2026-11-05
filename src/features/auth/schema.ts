import { z } from "zod";

export const signInSchema = z.object({
  email: z.string().trim().toLowerCase().pipe(z.email().max(254)),
  turnstileToken: z.string().max(2048).optional(),
});

// Tipi di link che la rotta di conferma accetta: link magico e prima iscrizione arrivano tutti e due come "email"
// (template con token_hash); "magiclink" e "signup" sono i nomi vecchi che Supabase può ancora mandare.
export const emailLinkSchema = z.union([
  z.object({ tokenHash: z.string().min(1).max(2048), type: z.enum(["email", "magiclink", "signup"]) }),
  z.object({ code: z.string().min(1).max(2048) }),
]);

/** Parametri grezzi del link dell'email, validati da emailLinkSchema dentro l'action. */
export type EmailLinkParams = { tokenHash: string | null; type: string | null; code: string | null };
