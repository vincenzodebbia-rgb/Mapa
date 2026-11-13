import type { NextConfig } from "next";
import { flags } from "./src/config/flags";

const isDev = process.env.NODE_ENV === "development";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
if (!supabaseUrl) {
  throw new Error("NEXT_PUBLIC_SUPABASE_URL is missing: copy .env.example to .env.local (or set it in CI/Vercel).");
}
const supabaseOrigin = new URL(supabaseUrl).origin;
const supabaseRealtime = supabaseOrigin.replace(/^https:/, "wss:");

const OPENFREEMAP = "https://tiles.openfreemap.org";
const TURNSTILE = "https://challenges.cloudflare.com";

// CSP statica (senza nonce), così le pagine possono restare statiche: i nonce obbligano al rendering dinamico
// e rompono il Partial Prerendering.
const contentSecurityPolicy = [
  "default-src 'self'",
  // 'unsafe-inline': Next.js mette inline gli script che passano a React i dati della pagina; senza, la pagina non si
  // idrata mai. L'iniezione si impedisce altrove: il testo del database si mostra solo come testo. Vedi docs/adr/0007-csp-unsafe-inline.md.
  // React usa eval() solo in sviluppo, per avere stack leggibili degli errori del server.
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""} ${TURNSTILE}`,
  "style-src 'self' 'unsafe-inline'",
  `img-src 'self' data: blob: ${supabaseOrigin} ${OPENFREEMAP}`,
  "font-src 'self'",
  `connect-src 'self' ${supabaseOrigin} ${supabaseRealtime} ${OPENFREEMAP}`,
  `frame-src ${TURNSTILE}`,
  // MapLibre fa girare il lettore delle tile in un web worker blob:.
  "worker-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  ...(isDev ? [] : ["upgrade-insecure-requests"]),
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: contentSecurityPolicy },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Non li chiediamo mai (docs/PRIVACY_AND_OWNERSHIP.md): vietati anche a qualsiasi codice incorporato.
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  // Sito demo: ogni risposta (pagine, immagini, sitemap) resta fuori dai motori di ricerca. robots.txt lascia entrare
  // i crawler, così possono leggerlo.
  ...(flags.demo ? [{ key: "X-Robots-Tag", value: "noindex, nofollow" }] : []),
];

const nextConfig: NextConfig = {
  // Solo in sviluppo: l'e2e di Compartir apre lo stesso dev server come 127.0.0.1 (un host diverso dall'URL del sito,
  // come un'anteprima Vercel). Solo loopback: niente fuori da questo computer.
  allowedDevOrigins: ["127.0.0.1"],
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  async headers() {
    return [{ source: "/(.*)", headers: securityHeaders }];
  },
};

export default nextConfig;
