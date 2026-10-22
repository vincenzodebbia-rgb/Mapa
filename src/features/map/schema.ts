import { z } from "zod";
import type { EventCategory, OrganizationKind } from "./types";

// Map filters live in the URL (docs/SPEC.md §4), so they survive a reload, a shared link and a page without JS.
// Unknown or malformed values are ignored, never an error: a typo in a URL still shows the map.

export const EVENT_CATEGORIES = [
  "musica",
  "teatro_danza",
  "arte",
  "talleres",
  "encuentros",
  "comunidad",
  "otros",
] as const satisfies readonly EventCategory[];

export const PRICE_FILTERS = ["gratis", "pago"] as const;

/** URL value → organization kind ("Quién organiza"). */
export const ORGANIZER_FILTERS = {
  asociaciones: "association",
  espacios: "venue",
  gente: "professional",
} as const satisfies Record<string, OrganizationKind>;

export type PriceFilter = (typeof PRICE_FILTERS)[number];
export type OrganizerFilter = keyof typeof ORGANIZER_FILTERS;

export type MapFilters = {
  precio?: PriceFilter;
  cat?: EventCategory;
  quien?: OrganizerFilter;
  barrio?: string;
  soloHoy: boolean;
  lista: boolean;
};

const priceSchema = z.enum(PRICE_FILTERS);
const categorySchema = z.enum(EVENT_CATEGORIES);
const organizerSchema = z.enum(["asociaciones", "espacios", "gente"] as const satisfies readonly OrganizerFilter[]);
const slugSchema = z
  .string()
  .max(120)
  .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/);

type RawSearchParams = Record<string, string | string[] | undefined>;

function readOptional<T>(schema: z.ZodType<T>, value: string | string[] | undefined): T | undefined {
  const first = Array.isArray(value) ? value[0] : value;
  const result = schema.safeParse(first);
  return result.success ? result.data : undefined;
}

function readFlag(value: string | string[] | undefined, expected: string): boolean {
  return (Array.isArray(value) ? value[0] : value) === expected;
}

export function parseMapFilters(params: RawSearchParams): MapFilters {
  return {
    precio: readOptional(priceSchema, params.precio),
    cat: readOptional(categorySchema, params.cat),
    quien: readOptional(organizerSchema, params.quien),
    barrio: readOptional(slugSchema, params.barrio),
    soloHoy: readFlag(params.solo, "hoy"),
    lista: readFlag(params.vista, "lista"),
  };
}

/** Link to a map page with these filters. Empty filters are left out, so the plain map is just the path. */
export function buildMapHref(pathname: string, filters: Partial<MapFilters>): string {
  const query = new URLSearchParams();
  if (filters.precio) query.set("precio", filters.precio);
  if (filters.cat) query.set("cat", filters.cat);
  if (filters.quien) query.set("quien", filters.quien);
  if (filters.barrio) query.set("barrio", filters.barrio);
  if (filters.soloHoy) query.set("solo", "hoy");
  if (filters.lista) query.set("vista", "lista");
  const search = query.toString();
  return search ? `${pathname}?${search}` : pathname;
}

export function hasEventFilters(filters: MapFilters): boolean {
  return Boolean(filters.precio || filters.cat || filters.quien || filters.barrio || filters.soloHoy);
}
