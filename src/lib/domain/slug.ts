import { z } from "zod";

// Same rule as the check constraints in the database (organizations, events, neighborhoods).
// A slug that cannot exist is rejected before any query: unknown pages answer 404 without touching the database.
export const slugSchema = z.string().max(80).regex(/^[a-z0-9]+(-[a-z0-9]+)*$/);

export function parseSlug(value: unknown): string | null {
  const result = slugSchema.safeParse(value);
  return result.success ? result.data : null;
}
