import { describe, expect, it } from "vitest";
import { deleteConfirmationSchema, getExportFileName } from "./schema";

describe("deleteConfirmationSchema", () => {
  it("accepts only the exact word, with spaces around tolerated", () => {
    expect(deleteConfirmationSchema.safeParse("ELIMINAR").success).toBe(true);
    expect(deleteConfirmationSchema.safeParse("  ELIMINAR ").success).toBe(true);
    expect(deleteConfirmationSchema.safeParse("eliminar").success).toBe(false);
    expect(deleteConfirmationSchema.safeParse("").success).toBe(false);
    expect(deleteConfirmationSchema.safeParse(null).success).toBe(false);
  });
});

describe("getExportFileName", () => {
  it("uses only the date", () => {
    expect(getExportFileName(new Date("2026-11-14T10:00:00Z"))).toBe("mis-datos-2026-11-14.json");
  });
});
