import { getMyDataExport } from "@/features/account/data";
import { getExportFileName } from "@/features/account/schema";
import { getHashedKey, isWithinRateLimit } from "@/lib/rate-limit";
import { getCurrentUserId } from "@/lib/supabase/current-user";

// GET /panel/cuenta/datos: "Descargar mis datos" come file JSON (export_my_data, letto come l'utente).
// Privato e mai in cache; senza sessione rimanda a /entrar. Limite: 10 download all'ora per utente.
const EXPORTS_PER_USER_PER_HOUR = 10;
const PRIVATE_HEADERS = { "Cache-Control": "private, no-store", "X-Robots-Tag": "noindex" };

export async function GET(request: Request): Promise<Response> {
  const userId = await getCurrentUserId();
  if (!userId) return Response.redirect(new URL("/entrar", request.url), 303);

  try {
    if (!(await isWithinRateLimit(getHashedKey("export", userId), EXPORTS_PER_USER_PER_HOUR, "1 hour"))) {
      return new Response(null, { status: 429, headers: PRIVATE_HEADERS });
    }
    const data = await getMyDataExport();
    return new Response(JSON.stringify(data, null, 2), {
      headers: {
        ...PRIVATE_HEADERS,
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="${getExportFileName(new Date())}"`,
      },
    });
  } catch {
    // Solo lo stato: mai i dati nei log.
    return new Response(null, { status: 500, headers: PRIVATE_HEADERS });
  }
}
