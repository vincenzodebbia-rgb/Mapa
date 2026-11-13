// Regole del NIF prima del database, così un DNI/NIE non parte mai dal browser verso Supabase.
// Copia esatta di private.normalize_nif, private.is_personal_nif, private.is_entity_nif e private.nif_allowed_for
// (supabase/migrations/20261018100001_extensions_enums.sql e 20261030121852_entity_type.sql): il database resta l'arbitro.

export const ENTITY_TYPES = [
  "association",
  "foundation",
  "cooperative",
  "public_entity",
  "commercial",
  "informal",
] as const;

export type EntityType = (typeof ENTITY_TYPES)[number];

/** Maiuscolo, solo lettere e cifre (come private.normalize_nif). */
export function normalizeNif(value: string): string {
  return value.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
}

/** DNI, NIE o NIF personali speciali (K/L/M): si riconoscono solo per rifiutarli. */
export function isPersonalNif(nif: string): boolean {
  return /^([0-9]{8}|[KLMXYZ][0-9]{7})[A-Z]$/.test(nif);
}

/** Formato da persona giuridica. */
export function isEntityNif(nif: string): boolean {
  return /^[ABCDEFGHJNPQRSUVW][0-9]{7}[0-9A-J]$/.test(nif);
}

const ALLOWED_FIRST_LETTERS: Record<EntityType, RegExp | null> = {
  association: /^G/,
  foundation: /^G/,
  cooperative: /^F/,
  public_entity: /^[PQS]/,
  commercial: /^[ABEJ]/,
  informal: null,
};

/** Lettera iniziale giusta per la forma giuridica. I gruppi informali non hanno NIF. */
export function isNifAllowedFor(entityType: EntityType, nif: string): boolean {
  const letters = ALLOWED_FIRST_LETTERS[entityType];
  return letters !== null && isEntityNif(nif) && letters.test(nif);
}

export type NifProblem = "personal_nif" | "invalid_nif";

/** null = NIF accettabile per quel tipo (il NIF deve essere già normalizzato). */
export function findNifProblem(entityType: EntityType, nif: string): NifProblem | null {
  if (isPersonalNif(nif)) return "personal_nif";
  if (!isNifAllowedFor(entityType, nif)) return "invalid_nif";
  return null;
}
