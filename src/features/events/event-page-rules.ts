// Regole di indicizzazione della pagina evento (docs/SPEC.md §14): indicizzata fino alla fine,
// poi, 7 giorni dopo la fine dell'ULTIMA occorrenza, un redirect permanente alla scheda di chi organizza.

export const EVENT_REDIRECT_AFTER_DAYS = 7;
const DAY_MS = 24 * 60 * 60 * 1000;

/** True quando sono passati 7 giorni dalla fine dell'ultima occorrenza dell'evento. */
export function shouldRedirectEvent(lastEndsAt: string, now: Date): boolean {
  return now.getTime() >= new Date(lastEndsAt).getTime() + EVENT_REDIRECT_AFTER_DAYS * DAY_MS;
}

/** Nella sitemap e indicizzabile solo finché un'occorrenza non è finita. */
export function isEventIndexable(lastEndsAt: string, now: Date): boolean {
  return new Date(lastEndsAt).getTime() > now.getTime();
}
