# Stack: Next.js 16, Supabase, MapLibre/OpenFreeMap, Tailwind v4, Vercel

Status: accepted (2026-10)

## Decision
Stack: Next.js 16, Supabase, MapLibre/OpenFreeMap, Tailwind v4, Vercel

## Why
Mainstream, documented, free tiers fit a solo founder; Supabase gives auth+Postgres+RLS+storage in one EU-hosted service; MapLibre+OpenFreeMap are open source with no API key or per-load billing (Mapbox GL is proprietary since v2 and bills per load).

## Consequences
Vendor limits: Supabase Free pauses and has no backups; Vercel Hobby forbids commercial use (donations are fine); OpenFreeMap is donation-run with no SLA, fallback style in brand.ts.
