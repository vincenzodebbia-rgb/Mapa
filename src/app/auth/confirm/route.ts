import { redirect } from "next/navigation";
import type { NextRequest } from "next/server";
import { confirmEmailLink } from "@/features/auth/actions";

// Arrivo dal link dell'email. Dopo l'accesso si va sempre a /panel: è /panel che manda a /registro chi non ha
// ancora un'organizzazione (nessun parametro `next`, quindi nessun redirect aperto).
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const tokenHash = params.get("token_hash");
  const type = params.get("type");
  const code = params.get("code");

  const result = tokenHash
    ? await confirmEmailLink({ tokenHash, type: type as "email" })
    : code
      ? await confirmEmailLink({ code })
      : { ok: false };

  redirect(result.ok ? "/panel" : "/entrar?error=enlace");
}
