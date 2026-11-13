import type { NextRequest } from "next/server";
import { refreshSession } from "@/lib/supabase/proxy-session";

// Tiene solo aggiornato il cookie di accesso. L'autorizzazione si ricontrolla in ogni pagina e action.
export async function proxy(request: NextRequest) {
  return refreshSession(request);
}

export const config = {
  // Salta i file statici: non hanno mai bisogno di una sessione.
  matcher: ["/((?!_next/static|_next/image|brand/|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
};
