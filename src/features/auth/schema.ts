import { z } from "zod";

export const signInSchema = z.object({
  email: z.string().trim().toLowerCase().pipe(z.email().max(254)),
  turnstileToken: z.string().max(2048).optional(),
});

// Link types the confirm route accepts: magic link and first sign-up both arrive as "email" (template with
// token_hash); "magiclink" and "signup" are the older names Supabase may still send.
export const emailLinkSchema = z.union([
  z.object({ tokenHash: z.string().min(1).max(2048), type: z.enum(["email", "magiclink", "signup"]) }),
  z.object({ code: z.string().min(1).max(2048) }),
]);

/** Raw query parameters of the email link, validated by emailLinkSchema inside the action. */
export type EmailLinkParams = { tokenHash: string | null; type: string | null; code: string | null };
