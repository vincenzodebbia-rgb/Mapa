"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getConnectionKey, getHashedKey, isWithinRateLimit } from "@/lib/rate-limit";
import { getSiteUrl } from "@/lib/site-url";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { verifyTurnstileToken } from "@/lib/turnstile";
import { emailLinkSchema, signInSchema, type EmailLinkInput } from "./schema";
import type { SignInState } from "./types";

// Limits for sending a magic link: per connection and per email (both as daily HMAC, never in clear).
const LINKS_PER_CONNECTION_PER_HOUR = 5;
const LINKS_PER_EMAIL_PER_HOUR = 3;

/**
 * Where the email link comes back: the site the person is using (localhost, a Vercel preview, production) + the
 * confirm route, with no query string (the email template appends `?token_hash=…&type=email`). Supabase sends
 * the link only if this URL is in its Redirect URLs allow list.
 */
async function getEmailRedirectUrl(): Promise<string> {
  const origin = (await headers()).get("origin");
  let base = getSiteUrl();
  if (origin) {
    try {
      const url = new URL(origin);
      if (url.protocol === "https:" || url.protocol === "http:") base = new URL(url.origin);
    } catch {
      // Not a URL: keep the site URL.
    }
  }
  return new URL("/auth/confirm", base).toString();
}

/** Sends a magic link. Public: Turnstile + rate limits. The answer is the same whether or not the email exists. */
export async function requestMagicLink(previous: SignInState, formData: FormData): Promise<SignInState> {
  const attempt = previous.attempt + 1;
  const parsed = signInSchema.safeParse({
    email: formData.get("email"),
    turnstileToken: formData.get("cf-turnstile-response") ?? undefined,
  });
  if (!parsed.success) return { ok: false, sent: false, error: "invalidEmail", attempt };

  // No user to check: this is the way in. Anti-robot first, then the limits.
  if (!(await verifyTurnstileToken(parsed.data.turnstileToken))) {
    return { ok: false, sent: false, error: "robot", attempt };
  }
  try {
    const withinConnection = await isWithinRateLimit(await getConnectionKey("magic-link"), LINKS_PER_CONNECTION_PER_HOUR, "1 hour");
    const withinEmail = await isWithinRateLimit(getHashedKey("magic-link", parsed.data.email), LINKS_PER_EMAIL_PER_HOUR, "1 hour");
    if (!withinConnection || !withinEmail) return { ok: false, sent: false, error: "tooMany", attempt };
  } catch {
    return { ok: false, sent: false, error: "generic", attempt };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithOtp({
    email: parsed.data.email,
    options: { emailRedirectTo: await getEmailRedirectUrl(), shouldCreateUser: true },
  });
  if (error) {
    // Never log the email: only the error code.
    console.warn("signInWithOtp failed:", error.code ?? error.name);
    if (error.code === "over_email_send_rate_limit" || error.status === 429) {
      return { ok: false, sent: false, error: "tooMany", attempt };
    }
    if (error.code === "email_address_invalid") return { ok: false, sent: false, error: "invalidEmail", attempt };
    return { ok: false, sent: false, error: "generic", attempt };
  }
  return { ok: true, sent: true, error: null, attempt };
}

/**
 * Exchanges the link of the email for a session cookie. Called by src/app/auth/confirm/route.ts, which redirects.
 * Accepts the token_hash of our email template and the `code` of the default Supabase link (PKCE).
 */
export async function confirmEmailLink(input: EmailLinkInput): Promise<{ ok: boolean }> {
  const parsed = emailLinkSchema.safeParse(input);
  if (!parsed.success) return { ok: false };
  const supabase = await createSupabaseServerClient();
  const { error } =
    "code" in parsed.data
      ? await supabase.auth.exchangeCodeForSession(parsed.data.code)
      : await supabase.auth.verifyOtp({ token_hash: parsed.data.tokenHash, type: parsed.data.type });
  if (error) {
    console.warn("Email link rejected:", error.code ?? error.name);
    return { ok: false };
  }
  return { ok: true };
}

export async function signOut(): Promise<void> {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signOut();
  if (error) console.warn("signOut failed:", error.code ?? error.name);
  redirect("/");
}
