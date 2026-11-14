"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getAccessState } from "@/lib/access";
import { getConnectionKey, getHashedKey, isWithinRateLimit } from "@/lib/rate-limit";
import { getSiteUrl } from "@/lib/site-url";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { verifyTurnstileToken } from "@/lib/turnstile";
import { emailLinkSchema, signInSchema, type EmailLinkParams } from "./schema";
import type { SignInState } from "./types";

// Limiti per l'invio del link magico: per connessione e per email (tutte e due come HMAC giornaliero, mai in chiaro).
const LINKS_PER_CONNECTION_PER_HOUR = 5;
const LINKS_PER_EMAIL_PER_HOUR = 3;

/**
 * Dove torna il link dell'email: il sito che la persona sta usando (localhost, un'anteprima Vercel, la produzione) + la
 * rotta di conferma, senza parametri (il template dell'email aggiunge `?token_hash=…&type=email`). Supabase manda
 * il link solo se questo URL è nell'elenco dei Redirect URL.
 */
async function getEmailRedirectUrl(): Promise<string> {
  const origin = (await headers()).get("origin");
  let base = getSiteUrl();
  if (origin) {
    try {
      const url = new URL(origin);
      if (url.protocol === "https:" || url.protocol === "http:") base = new URL(url.origin);
    } catch {
      // Non è un URL: si tiene l'URL del sito.
    }
  }
  return new URL("/auth/confirm", base).toString();
}

/** Manda un link magico. Pubblica: Turnstile + limiti di frequenza. La risposta è la stessa che l'email esista o no. */
export async function requestMagicLink(previous: SignInState, formData: FormData): Promise<SignInState> {
  const attempt = previous.attempt + 1;
  const parsed = signInSchema.safeParse({
    email: formData.get("email"),
    turnstileToken: formData.get("cf-turnstile-response") ?? undefined,
  });
  if (!parsed.success) return { ok: false, sent: false, error: "invalidEmail", attempt };
  // Demo o variabili mancanti: la pagina non mostra il modulo; una chiamata diretta riceve un errore pulito.
  if (getAccessState() !== "available") return { ok: false, sent: false, error: "generic", attempt };

  // Nessun utente da controllare: questa è la porta d'ingresso. Prima l'anti-robot, poi i limiti.
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
    // Mai l'email nei log: solo il codice dell'errore.
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
 * Scambia il link dell'email con un cookie di sessione. La chiama src/app/auth/confirm/route.ts, che poi reindirizza.
 * Accetta il token_hash del nostro template email e il `code` del link standard di Supabase (PKCE).
 */
export async function confirmEmailLink(params: EmailLinkParams): Promise<{ ok: boolean }> {
  const parsed = emailLinkSchema.safeParse(params);
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
