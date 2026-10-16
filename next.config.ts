import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const isDev = process.env.NODE_ENV === "development";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
if (!supabaseUrl) {
  throw new Error("NEXT_PUBLIC_SUPABASE_URL is missing: copy .env.example to .env.local (or set it in CI/Vercel).");
}
const supabaseOrigin = new URL(supabaseUrl).origin;
const supabaseRealtime = supabaseOrigin.replace(/^https:/, "wss:");

const OPENFREEMAP = "https://tiles.openfreemap.org";
const TURNSTILE = "https://challenges.cloudflare.com";

// Static CSP (no nonces), so pages can stay statically rendered.
const contentSecurityPolicy = [
  "default-src 'self'",
  // React uses eval() only in development, for readable server error stacks.
  `script-src 'self'${isDev ? " 'unsafe-eval'" : ""} ${TURNSTILE}`,
  "style-src 'self' 'unsafe-inline'",
  `img-src 'self' data: blob: ${supabaseOrigin} ${OPENFREEMAP}`,
  "font-src 'self'",
  `connect-src 'self' ${supabaseOrigin} ${supabaseRealtime} ${OPENFREEMAP}`,
  `frame-src ${TURNSTILE}`,
  // MapLibre runs its tile parser in a blob: web worker.
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
  // We never ask for these (docs/PRIVACY_AND_OWNERSHIP.md): forbid them for any embedded code too.
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

const nextConfig: NextConfig = {
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

const withNextIntl = createNextIntlPlugin("./src/lib/i18n/request.ts");

export default withNextIntl(nextConfig);
