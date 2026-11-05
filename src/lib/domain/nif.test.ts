import { describe, expect, it } from "vitest";
import { findNifProblem, isNifAllowedFor, isPersonalNif, normalizeNif } from "./nif";

describe("normalizeNif", () => {
  it("keeps only letters and digits, uppercase", () => {
    expect(normalizeNif(" g-99.000 011 ")).toBe("G99000011");
  });
});

describe("isPersonalNif", () => {
  it("recognizes DNI, NIE and K/L/M numbers", () => {
    expect(isPersonalNif("12345678Z")).toBe(true);
    expect(isPersonalNif("X1234567L")).toBe(true);
    expect(isPersonalNif("Y1234567X")).toBe(true);
    expect(isPersonalNif("K1234567A")).toBe(true);
  });

  it("does not flag entity NIFs", () => {
    expect(isPersonalNif("G99000011")).toBe(false);
    expect(isPersonalNif("B12345678")).toBe(false);
  });
});

describe("isNifAllowedFor", () => {
  it("accepts the right first letter for each entity type", () => {
    expect(isNifAllowedFor("association", "G99000011")).toBe(true);
    expect(isNifAllowedFor("foundation", "G99000011")).toBe(true);
    expect(isNifAllowedFor("cooperative", "F99000011")).toBe(true);
    expect(isNifAllowedFor("public_entity", "P2807900B")).toBe(true);
    expect(isNifAllowedFor("public_entity", "Q2800000J")).toBe(true);
    expect(isNifAllowedFor("public_entity", "S2800000A")).toBe(true);
    expect(isNifAllowedFor("commercial", "B12345678")).toBe(true);
    expect(isNifAllowedFor("commercial", "A12345678")).toBe(true);
    expect(isNifAllowedFor("commercial", "E12345678")).toBe(true);
    expect(isNifAllowedFor("commercial", "J12345678")).toBe(true);
  });

  it("rejects a valid entity NIF with the wrong letter for the type", () => {
    expect(isNifAllowedFor("association", "F99000011")).toBe(false);
    expect(isNifAllowedFor("cooperative", "G99000011")).toBe(false);
    expect(isNifAllowedFor("commercial", "G99000011")).toBe(false);
    expect(isNifAllowedFor("public_entity", "B12345678")).toBe(false);
  });

  it("never accepts a NIF for informal groups", () => {
    expect(isNifAllowedFor("informal", "G99000011")).toBe(false);
  });

  it("rejects malformed NIFs", () => {
    expect(isNifAllowedFor("association", "G123")).toBe(false);
    expect(isNifAllowedFor("association", "G1234567Z")).toBe(false);
  });
});

describe("findNifProblem", () => {
  it("tells a personal document apart from a wrong format", () => {
    expect(findNifProblem("commercial", "12345678Z")).toBe("personal_nif");
    expect(findNifProblem("association", "X1234567L")).toBe("personal_nif");
    expect(findNifProblem("association", "B12345678")).toBe("invalid_nif");
    expect(findNifProblem("association", "G99000011")).toBeNull();
  });
});
