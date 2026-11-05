import type { MetadataRoute } from "next";
import { flags } from "@/config/flags";
import { toAbsoluteUrl } from "@/lib/site-url";

// Le aree private restano fuori dai motori di ricerca (docs/SPEC.md §14). Anche le pagine stesse hanno il noindex.
const PRIVATE_PATHS = ["/panel", "/profesionales", "/entrar", "/registro", "/invitacion/"];

export default function robots(): MetadataRoute.Robots {
  // Sito demo: nessun Disallow. Una pagina bloccata non viene mai letta, quindi il suo noindex sfuggirebbe e l'URL
  // nudo potrebbe comparire comunque; i crawler devono entrare e trovare il noindex ovunque (X-Robots-Tag + meta).
  // Nemmeno la sitemap.
  if (flags.demo) return { rules: { userAgent: "*", allow: "/" } };
  return {
    rules: { userAgent: "*", allow: "/", disallow: PRIVATE_PATHS },
    sitemap: toAbsoluteUrl("/sitemap.xml"),
  };
}
