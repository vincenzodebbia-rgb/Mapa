import "server-only";
import { z } from "zod";

const serverEnvSchema = z.object({
  SUPABASE_SECRET_KEY: z.string().min(1),
  TURNSTILE_SECRET_KEY: z.string().min(1),
  NOMINATIM_USER_AGENT: z.string().min(1),
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;

let cachedServerEnv: ServerEnv | undefined;

// Variabili di sistema di Vercel (impostate da Vercel al build e all'esecuzione, senza protocollo). Non sono segreti e
// non sono mai obbligatorie: mancanti, vuote o non valide = non impostate, così build locali e CI continuano a funzionare.
// Le usa src/lib/site-url.ts.
const deploymentEnvSchema = z.object({
  VERCEL_PROJECT_PRODUCTION_URL: z.string().min(1).optional().catch(undefined),
  VERCEL_URL: z.string().min(1).optional().catch(undefined),
});

export type DeploymentEnv = z.infer<typeof deploymentEnvSchema>;

export function getDeploymentEnv(): DeploymentEnv {
  return deploymentEnvSchema.parse({
    VERCEL_PROJECT_PRODUCTION_URL: process.env.VERCEL_PROJECT_PRODUCTION_URL,
    VERCEL_URL: process.env.VERCEL_URL,
  });
}

/** true se ci sono tutte le variabili segrete: senza, le action che le usano non devono nemmeno partire (src/lib/access.ts). */
export function hasServerEnv(): boolean {
  return serverEnvSchema.safeParse({
    SUPABASE_SECRET_KEY: process.env.SUPABASE_SECRET_KEY,
    TURNSTILE_SECRET_KEY: process.env.TURNSTILE_SECRET_KEY,
    NOMINATIM_USER_AGENT: process.env.NOMINATIM_USER_AGENT,
  }).success;
}

/** Validate solo al primo uso, così `next build` in CI funziona con le sole variabili pubbliche. */
export function getServerEnv(): ServerEnv {
  cachedServerEnv ??= serverEnvSchema.parse({
    SUPABASE_SECRET_KEY: process.env.SUPABASE_SECRET_KEY,
    TURNSTILE_SECRET_KEY: process.env.TURNSTILE_SECRET_KEY,
    NOMINATIM_USER_AGENT: process.env.NOMINATIM_USER_AGENT,
  });
  return cachedServerEnv;
}
