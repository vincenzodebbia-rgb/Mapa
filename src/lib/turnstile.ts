import "server-only";
import { z } from "zod";
import { getServerEnv } from "./server-env";

const SITEVERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";
// Cloudflare documents a maximum of 2048 characters for a token.
const MAX_TOKEN_LENGTH = 2048;
const TIMEOUT_MS = 5000;

const siteverifyResponseSchema = z.object({ success: z.boolean() });

type FetchLike = (input: string, init: RequestInit) => Promise<Response>;

/**
 * Checks a Turnstile token with Cloudflare. Fails closed: any problem (no token, timeout, bad answer) = false.
 * The visitor's IP is NOT sent: Cloudflare does not need it to validate the token (minimum data).
 */
export async function checkTurnstileToken(token: unknown, secret: string, fetchImpl: FetchLike = fetch): Promise<boolean> {
  if (typeof token !== "string" || token.length === 0 || token.length > MAX_TOKEN_LENGTH) return false;
  try {
    const response = await fetchImpl(SITEVERIFY_URL, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ secret, response: token }).toString(),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!response.ok) return false;
    const parsed = siteverifyResponseSchema.safeParse(await response.json());
    return parsed.success && parsed.data.success;
  } catch {
    return false;
  }
}

export function verifyTurnstileToken(token: unknown): Promise<boolean> {
  return checkTurnstileToken(token, getServerEnv().TURNSTILE_SECRET_KEY);
}
