import "server-only";
import { z } from "zod";

const serverEnvSchema = z.object({
  SUPABASE_SECRET_KEY: z.string().min(1),
  TURNSTILE_SECRET_KEY: z.string().min(1),
  NOMINATIM_USER_AGENT: z.string().min(1),
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;

let cachedServerEnv: ServerEnv | undefined;

// Vercel system variables (set by Vercel at build and run time, without protocol). Not secrets, never required:
// missing, empty or invalid = not set, so local builds and CI keep working. Used by src/lib/site-url.ts.
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

/** Validated lazily, so `next build` in CI works with only the public variables set. */
export function getServerEnv(): ServerEnv {
  cachedServerEnv ??= serverEnvSchema.parse({
    SUPABASE_SECRET_KEY: process.env.SUPABASE_SECRET_KEY,
    TURNSTILE_SECRET_KEY: process.env.TURNSTILE_SECRET_KEY,
    NOMINATIM_USER_AGENT: process.env.NOMINATIM_USER_AGENT,
  });
  return cachedServerEnv;
}
