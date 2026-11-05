import { z } from "zod";

/**
 * Variabili d'ambiente pubbliche (sicure nel browser).
 * I segreti solo server stanno in src/lib/server-env.ts, così non possono mai finire nel bundle del client.
 */
const publicEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.url(),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(1),
  // Non blocca mai build né CI: mancante, vuota o non valida = non impostata. La catena di riserva sta in src/lib/site-url.ts.
  NEXT_PUBLIC_SITE_URL: z.url().optional().catch(undefined),
  NEXT_PUBLIC_TURNSTILE_SITE_KEY: z.string().min(1).optional(),
});

export type PublicEnv = z.infer<typeof publicEnvSchema>;

let cachedPublicEnv: PublicEnv | undefined;

export function getPublicEnv(): PublicEnv {
  cachedPublicEnv ??= publicEnvSchema.parse({
    // Una per una: Next.js mette le NEXT_PUBLIC_* nel bundle del browser solo quando sono scritte per esteso.
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
    NEXT_PUBLIC_TURNSTILE_SITE_KEY: process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY,
  });
  return cachedPublicEnv;
}
