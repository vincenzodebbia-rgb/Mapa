import { describe, expect, it } from "vitest";
import { isHttpUrl, lookupSchema, mapRegistrationDbError, parseRegistration, parseRegistrationType } from "./schema";

const accepted = { accept: "on" };

describe("parseRegistrationType", () => {
  it("maps the six URL values to entity types and rejects anything else", () => {
    expect(parseRegistrationType("asociacion")).toBe("association");
    expect(parseRegistrationType("fundacion")).toBe("foundation");
    expect(parseRegistrationType("cooperativa")).toBe("cooperative");
    expect(parseRegistrationType("entidad-publica")).toBe("public_entity");
    expect(parseRegistrationType("actividad-comercial")).toBe("commercial");
    expect(parseRegistrationType("gente")).toBe("informal");
    expect(parseRegistrationType("toString")).toBeNull();
    expect(parseRegistrationType(undefined)).toBeNull();
  });
});

describe("parseRegistration: asociación, fundación, cooperativa, entidad pública", () => {
  it("accepts a G NIF for an association, normalized, with empty optional fields as null", () => {
    const result = parseRegistration("association", { ...accepted, nif: "g-99000011", name: " La Colmena ", address: "", lng: "", lat: "" });
    expect(result.ok).toBe(true);
    if (result.ok && result.value.kind === "entity") {
      expect(result.value.data.nif).toBe("G99000011");
      expect(result.value.data.name).toBe("La Colmena");
      expect(result.value.data.address).toBeNull();
      expect(result.value.data.lng).toBeNull();
    }
  });

  it("requires the NIF and rejects DNI/NIE before the database", () => {
    expect(parseRegistration("association", { ...accepted, name: "X" })).toEqual({ ok: false, fieldErrors: { nif: "required" } });
    expect(parseRegistration("association", { ...accepted, name: "X", nif: "12345678Z" })).toEqual({
      ok: false,
      fieldErrors: { nif: "personalNif" },
    });
    expect(parseRegistration("foundation", { ...accepted, name: "X", nif: "X1234567L" })).toEqual({
      ok: false,
      fieldErrors: { nif: "personalNif" },
    });
  });

  it("checks the NIF letter for each type", () => {
    expect(parseRegistration("cooperative", { ...accepted, name: "X", nif: "G99000011" })).toEqual({
      ok: false,
      fieldErrors: { nif: "invalidNif" },
    });
    expect(parseRegistration("cooperative", { ...accepted, name: "X", nif: "F99000011" }).ok).toBe(true);
    expect(parseRegistration("public_entity", { ...accepted, name: "X", nif: "P2807900B" }).ok).toBe(true);
    expect(parseRegistration("public_entity", { ...accepted, name: "X", nif: "G99000011" }).ok).toBe(false);
  });

  it("requires the box with rules, terms, privacy and age", () => {
    expect(parseRegistration("association", { nif: "G99000011", name: "X" })).toEqual({
      ok: false,
      fieldErrors: { accept: "acceptRequired" },
    });
  });

  it("accepts only http/https links and valid emails", () => {
    const result = parseRegistration("association", {
      ...accepted,
      nif: "G99000011",
      name: "X",
      contactUrl: "javascript:alert(1)",
      contactEmail: "no-es-un-correo",
    });
    expect(result).toEqual({ ok: false, fieldErrors: { contactUrl: "invalidUrl", contactEmail: "invalidEmail" } });
  });

  it("enforces the column limits", () => {
    expect(parseRegistration("association", { ...accepted, nif: "G99000011", name: "x".repeat(121) })).toEqual({
      ok: false,
      fieldErrors: { name: "tooLong" },
    });
    expect(
      parseRegistration("association", { ...accepted, nif: "G99000011", name: "X", whatForWhom: "x".repeat(501) }),
    ).toEqual({ ok: false, fieldErrors: { whatForWhom: "tooLong" } });
  });
});

describe("parseRegistration: actividad comercial", () => {
  const venue = {
    ...accepted,
    name: "Librería Imaginaria",
    venueActivity: "libreria",
    whatForWhom: "Una librería de barrio",
    whatTheyOffer: "Presentaciones y lecturas",
    address: "Calle Ficticia 1",
  };

  it("accepts it without NIF (the database flags it)", () => {
    expect(parseRegistration("commercial", { ...venue, nif: "" }).ok).toBe(true);
  });

  it("accepts only company NIFs (A, B, E, J) and never a personal one", () => {
    expect(parseRegistration("commercial", { ...venue, nif: "B12345678" }).ok).toBe(true);
    expect(parseRegistration("commercial", { ...venue, nif: "12345678Z" })).toEqual({ ok: false, fieldErrors: { nif: "personalNif" } });
    expect(parseRegistration("commercial", { ...venue, nif: "G99000011" })).toEqual({ ok: false, fieldErrors: { nif: "invalidNif" } });
  });

  it("requires activity, both answers and the address", () => {
    expect(parseRegistration("commercial", { ...accepted, name: "X" })).toEqual({
      ok: false,
      fieldErrors: { venueActivity: "required", whatForWhom: "required", whatTheyOffer: "required", address: "required" },
    });
  });
});

describe("parseRegistration: gente que hace cosas", () => {
  it("needs name and what they do; no NIF; indexable from the checkbox", () => {
    const result = parseRegistration("informal", { ...accepted, name: "Colectivo Imaginario", oneLiner: "Hacemos murales", indexable: "on" });
    expect(result.ok).toBe(true);
    if (result.ok && result.value.kind === "informal") {
      expect(result.value.data.indexable).toBe(true);
      expect(result.value.data.neighborhoodSlug).toBeNull();
    }
    const hidden = parseRegistration("informal", { ...accepted, name: "X", oneLiner: "Y" });
    expect(hidden.ok && hidden.value.kind === "informal" && hidden.value.data.indexable).toBe(false);
  });

  it("rejects a malformed barrio slug", () => {
    expect(parseRegistration("informal", { ...accepted, name: "X", oneLiner: "Y", neighborhoodSlug: "../x" })).toEqual({
      ok: false,
      fieldErrors: { neighborhoodSlug: "invalidOption" },
    });
  });
});

describe("lookupSchema", () => {
  it("allows lookups only for listed types and entity NIFs", () => {
    expect(lookupSchema.safeParse({ entityType: "association", nif: "G99000011" }).success).toBe(true);
    expect(lookupSchema.safeParse({ entityType: "association", nif: "12345678Z" }).success).toBe(false);
    expect(lookupSchema.safeParse({ entityType: "commercial", nif: "B12345678" }).success).toBe(false);
  });
});

describe("isHttpUrl", () => {
  it("accepts http and https only", () => {
    expect(isHttpUrl("https://example.org/x")).toBe(true);
    expect(isHttpUrl("http://example.org")).toBe(true);
    expect(isHttpUrl("ftp://example.org")).toBe(false);
    expect(isHttpUrl("https://exa mple.org")).toBe(false);
  });
});

describe("mapRegistrationDbError", () => {
  it("turns SQL errors into field or form errors", () => {
    expect(mapRegistrationDbError("already_claimed")).toEqual({ type: "form", error: "alreadyClaimed" });
    expect(mapRegistrationDbError("personal_nif")).toEqual({ type: "field", field: "nif", error: "personalNif" });
    expect(mapRegistrationDbError("invalid_location")).toEqual({ type: "field", field: "address", error: "invalidLocation" });
    expect(mapRegistrationDbError("already_member")).toEqual({ type: "alreadyMember" });
    expect(mapRegistrationDbError("something else")).toEqual({ type: "form", error: "generic" });
  });
});
