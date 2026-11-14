import { z } from "zod";
import { getEventOwner, isEventOwnedBy } from "@/features/events/data";
import { getCurrentUserId } from "@/lib/supabase/current-user";
import type { Viewer } from "@/lib/viewer";

// GET /sesion[?evento=<uuid>]: chi sta guardando, per le isole "Mi panel" ed "Editar" delle pagine statiche.
// Risposta privata e mai in cache (dipende dal cookie). Solo due booleani: nessun id, nome o email.
// Proprietà dell'evento letta con la sessione dell'utente e le policy del database, mai con la chiave segreta.
// "Editar" è solo un aiuto: la pagina di modifica, l'action e la RLS ricontrollano tutto.

const eventIdSchema = z.uuid();
const PRIVATE_HEADERS = { "Cache-Control": "private, no-store", "X-Robots-Tag": "noindex" };

export async function GET(request: Request): Promise<Response> {
  const viewer: Viewer = { signedIn: false, canEditEvent: false };
  const userId = await getCurrentUserId();
  if (userId) {
    viewer.signedIn = true;
    const eventId = eventIdSchema.safeParse(new URL(request.url).searchParams.get("evento"));
    if (eventId.success) {
      try {
        const owner = await getEventOwner(userId);
        viewer.canEditEvent = owner !== null && (await isEventOwnedBy(eventId.data, owner.organizationId));
      } catch {
        // Nel dubbio niente link: la modifica resta raggiungibile da /panel.
        viewer.canEditEvent = false;
      }
    }
  }
  return Response.json(viewer, { headers: PRIVATE_HEADERS });
}
