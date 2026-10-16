# Static CSP with 'unsafe-inline' scripts

Status: accepted (2026-10)

## Decision
The Content-Security-Policy in `next.config.ts` is static (no nonces) and allows `'unsafe-inline'` in `script-src`.
Everything else stays strict: only self, Supabase, OpenFreeMap tiles and Cloudflare Turnstile;
`object-src 'none'`, `base-uri 'self'`, `form-action 'self'`, `frame-ancestors 'none'`.
`'unsafe-eval'` is added only in development.

## Why
- Next.js inlines small scripts in the HTML that hand page data to React. Tested in session 1 with
  `next build && next start`: without `'unsafe-inline'` the browser blocked 9 inline scripts and the page never
  hydrated (no buttons, no map, no forms would work). With it, the console is clean.
- Nonces are the alternative, but they force every page to render dynamically on each request and are
  incompatible with Partial Prerendering, which this project uses. We lose static, fast public pages.
- Hash-based CSP (Subresource Integrity) is still experimental in Next.js.
- The risk `script-src` protects against (an attacker injecting a `<script>`) is already closed elsewhere:
  text from the database is always rendered as text (lint: `react/no-danger`, no `innerHTML`, no `setHTML`;
  popups use `textContent`), and there are no third-party scripts.

## Consequences
- A future XSS bug that bypasses React escaping would not be stopped by the CSP: the "text only" rules in
  AGENTS.md and their lint checks are the real defence and must never be relaxed.
- Revisit when Next.js SRI (hash-based CSP) is stable: it would let us drop `'unsafe-inline'` and keep static pages.
