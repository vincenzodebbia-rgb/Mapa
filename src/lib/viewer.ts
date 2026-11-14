// Chi sta guardando una pagina pubblica statica: lo chiedono le piccole isole client ("Mi panel", "Editar") dopo il
// caricamento, così la pagina resta statica e in cache e nessun dato di un utente finisce nella cache condivisa.
// Solo un aiuto all'interfaccia: il controllo vero resta nelle pagine private, nelle action e nel database.

export const VIEWER_ROUTE = "/sesion";

export type Viewer = { signedIn: boolean; canEditEvent: boolean };

const ANONYMOUS: Viewer = { signedIn: false, canEditEvent: false };

/**
 * Il cookie di sessione dell'autenticazione (`sb-<progetto>-auth-token`, anche diviso in `.0`, `.1`) è leggibile dal
 * browser: senza, si risponde subito "anonimo" e il server non riceve nessuna richiesta (la gran parte delle visite).
 * Pura, per i test.
 */
export function hasSessionCookie(cookieHeader: string): boolean {
  return cookieHeader.split(";").some((part) => /^\s*sb-[^=]+-auth-token(\.\d+)?=/.test(part));
}

/** Risposta di GET /sesion → Viewer. Tutto ciò che non è esattamente `true` vale "no". Pura, per i test. */
export function parseViewer(body: unknown): Viewer {
  if (typeof body !== "object" || body === null) return ANONYMOUS;
  const record = body as Record<string, unknown>;
  return { signedIn: record.signedIn === true, canEditEvent: record.canEditEvent === true };
}

/** Solo nel browser. Qualsiasi errore = anonimo: nel dubbio non si mostra niente. */
export async function fetchViewer(eventId?: string): Promise<Viewer> {
  if (typeof document === "undefined" || !hasSessionCookie(document.cookie)) return ANONYMOUS;
  try {
    const url = eventId ? `${VIEWER_ROUTE}?evento=${encodeURIComponent(eventId)}` : VIEWER_ROUTE;
    const response = await fetch(url, { cache: "no-store", credentials: "same-origin" });
    if (!response.ok) return ANONYMOUS;
    return parseViewer(await response.json());
  } catch {
    return ANONYMOUS;
  }
}
