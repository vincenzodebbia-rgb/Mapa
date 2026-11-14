import { z } from "zod";
import type { EventCategory, OrganizationKind } from "./types";

// I filtri della mappa stanno nell'URL (docs/SPEC.md §4), così resistono a un ricaricamento, a un link condiviso e alla pagina senza JS.
// Valori sconosciuti o malformati si ignorano, mai un errore: con un refuso nell'URL la mappa si vede lo stesso.

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

/** Valore nell'URL → tipo di organizzazione ("Quién organiza"). */
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
  /** Slug di un evento da aprire sulla mappa (dopo "Publicar", D8). Non fa parte dei filtri: buildMapHref lo lascia fuori. */
  evento?: string;
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
    evento: readOptional(slugSchema, params.evento),
  };
}

/** Link a una pagina della mappa con questi filtri. I filtri vuoti si tralasciano, così la mappa semplice è solo il percorso. */
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
