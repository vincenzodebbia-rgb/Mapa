import { z } from "zod";

// Pezzi di validazione comuni ai moduli che scrivono la scheda di una realtà: iscrizione (onboarding) e Mi ficha
// (organizations). Stessi limiti delle colonne del database. I messaggi sono codici ("required", "tooLong",
// "invalidEmail", "invalidUrl", "invalidOption"): ogni modulo li trasforma nei suoi testi spagnoli.

export const asString = (value: unknown) => (typeof value === "string" ? value : "");

export const requiredText = (max: number) =>
  z.preprocess(asString, z.string().trim().min(1, "required").max(max, "tooLong"));

export const optionalText = (max: number) =>
  z.preprocess(asString, z.string().trim().max(max, "tooLong")).transform((value) => value || null);

/** Email pubblica: lo stesso controllo di z.email(), compatibile con il vincolo organizations_contact_email_format. */
export const optionalEmail = optionalText(254).refine(
  (value) => value === null || z.email().safeParse(value).success,
  "invalidEmail",
);

/** Dagli utenti solo link http/https (AGENTS.md). Stessa regola del vincolo sulla colonna. */
export function isHttpUrl(value: string): boolean {
  if (/\s/.test(value)) return false;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

export const optionalUrl = optionalText(500).refine((value) => value === null || isHttpUrl(value), "invalidUrl");

export const optionalEnum = <T extends readonly [string, ...string[]]>(values: T) =>
  z.preprocess((value) => (value === "" || value === undefined ? null : value), z.enum(values, "invalidOption").nullable());

/** Coordinata del pin (campo nascosto): vuota = nessun punto. */
export const coordinate = z.preprocess(
  (value) => (typeof value === "string" && value.trim() !== "" ? Number(value) : null),
  z.number().finite().nullable(),
);
