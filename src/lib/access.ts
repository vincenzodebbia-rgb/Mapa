import "server-only";
import { flags } from "@/config/flags";
import { getPublicEnv } from "./env";
import { hasServerEnv } from "./server-env";

/**
 * Stato dell'accesso e dell'iscrizione (/entrar, /registro), deciso sul server prima di mostrare un modulo:
 * - `demo`: sito demo (NEXT_PUBLIC_DEMO=1) → le pagine rimandano alla mappa, nessuno entra sui dati di prova;
 * - `unavailable`: mancano le chiavi di Turnstile o le variabili segrete del server → "El acceso estará disponible pronto",
 *   invece della pagina d'errore che darebbe la prima azione (getServerEnv lancia se manca una variabile);
 * - `available`: tutto pronto.
 */
export type AccessState = "demo" | "unavailable" | "available";

/** Pura, per i test. */
export function resolveAccessState(input: { demo: boolean; siteKey: string | undefined; serverEnvReady: boolean }): AccessState {
  if (input.demo) return "demo";
  if (!input.siteKey || !input.serverEnvReady) return "unavailable";
  return "available";
}

export function getAccessState(): AccessState {
  return resolveAccessState({
    demo: flags.demo,
    siteKey: getPublicEnv().NEXT_PUBLIC_TURNSTILE_SITE_KEY,
    serverEnvReady: hasServerEnv(),
  });
}
