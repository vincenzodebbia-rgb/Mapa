import { describe, expect, it } from "vitest";
import { mapProfileDbError, parseProfileForm } from "./schema";

const association = {
  name: "Asociación de prueba (ficticia)",
  oneLiner: "Vecinos que hacen cosas",
  whenToVisit: "",
  usualCategory: "musica",
  address: "Calle Inventada 1",
  lng: "-3.70",
  lat: "40.41",
  whatForWhom: "",
  howSustained: "",
  contactEmail: "hola@asociacion.example",
  contactPhone: "",
  contactUrl: "",
  story: "Empezamos en un garaje.",
};

describe("parseProfileForm", () => {
  it("accepts an association with optional fields left empty", () => {
    const result = parseProfileForm("association", association);
    expect(result.ok && result.value).toMatchObject({
      kind: "association",
      name: "Asociación de prueba (ficticia)",
      whenToVisit: null,
      contactPhone: null,
      story: "Empezamos en un garaje.",
      lng: -3.7,
      lat: 40.41,
    });
  });

  it("asks a venue for activity, address and both answers", () => {
    expect(parseProfileForm("venue", { name: "Librería de prueba" })).toEqual({
      ok: false,
      fieldErrors: { venueActivity: "required", address: "required", whatForWhom: "required", whatTheyOffer: "required" },
    });
  });

  it("checks public contacts and the story length", () => {
    expect(
      parseProfileForm("association", { ...association, contactEmail: "x@y.es?bcc=z", contactUrl: "javascript:alert(1)", story: "x".repeat(1001) }),
    ).toEqual({ ok: false, fieldErrors: { contactEmail: "invalidEmail", contactUrl: "invalidUrl", story: "tooLong" } });
  });

  it("refuses a pin outside the Comunidad de Madrid, or only half of it", () => {
    expect(parseProfileForm("association", { ...association, lng: "2.17", lat: "41.38" })).toEqual({
      ok: false,
      fieldErrors: { address: "invalidLocation" },
    });
    expect(parseProfileForm("association", { ...association, lat: "" })).toEqual({
      ok: false,
      fieldErrors: { address: "invalidLocation" },
    });
  });

  it("reads the Google switch and the neighborhood for Gente que hace cosas, and ignores place fields", () => {
    const on = parseProfileForm("professional", { name: "Estudio", oneLiner: "Ilustración", indexable: "on", neighborhoodSlug: "opanel", address: "Calle 1" });
    expect(on.ok && on.value).toMatchObject({ kind: "professional", indexable: true, neighborhoodSlug: "opanel" });
    expect(on.ok && "address" in on.value).toBe(false);
    const off = parseProfileForm("professional", { name: "Estudio", oneLiner: "Ilustración" });
    expect(off.ok && off.value.kind === "professional" && off.value.indexable).toBe(false);
  });

  it("never reads NIF or entity type from the form", () => {
    const result = parseProfileForm("association", { ...association, nif: "G00000000", entityType: "foundation" });
    expect(result.ok && "nif" in result.value).toBe(false);
    expect(result.ok && "entityType" in result.value).toBe(false);
  });
});

describe("mapProfileDbError", () => {
  it("turns database errors into messages", () => {
    expect(mapProfileDbError({ message: "rate_limited" })).toEqual({ type: "form", error: "tooManyRenames" });
    expect(mapProfileDbError({ message: 'violates check constraint "organizations_contact_email_format"' })).toEqual({
      type: "field",
      field: "contactEmail",
      error: "invalidEmail",
    });
    expect(mapProfileDbError({ message: "permission denied", code: "42501" })).toEqual({ type: "form", error: "notAllowed" });
    expect(mapProfileDbError({ message: "invalid_location" })).toEqual({ type: "field", field: "address", error: "invalidLocation" });
    expect(mapProfileDbError({ message: "invalid_neighborhood" })).toEqual({
      type: "field",
      field: "neighborhoodSlug",
      error: "invalidOption",
    });
    expect(mapProfileDbError({ message: "not_allowed" })).toEqual({ type: "form", error: "notAllowed" });
    expect(mapProfileDbError({ message: "boom" })).toEqual({ type: "form", error: "generic" });
  });
});
