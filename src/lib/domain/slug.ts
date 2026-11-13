import { z } from "zod";

// La stessa regola dei vincoli check del database (organizations, events, neighborhoods).
// Uno slug che non può esistere si rifiuta prima di ogni query: le pagine sconosciute rispondono 404 senza toccare il database.
export const slugSchema = z.string().max(80).regex(/^[a-z0-9]+(-[a-z0-9]+)*$/);

export function parseSlug(value: unknown): string | null {
  const result = slugSchema.safeParse(value);
  return result.success ? result.data : null;
}
