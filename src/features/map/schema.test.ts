import { describe, expect, it } from "vitest";
import { buildMapHref, hasEventFilters, parseMapFilters } from "./schema";

describe("parseMapFilters", () => {
  it("reads every filter from the URL", () => {
    expect(
      parseMapFilters({
        precio: "gratis",
        cat: "musica",
        quien: "asociaciones",
        barrio: "opanel",
        solo: "hoy",
        vista: "lista",
      }),
    ).toEqual({ precio: "gratis", cat: "musica", quien: "asociaciones", barrio: "opanel", soloHoy: true, lista: true });
  });

  it("gives the plain map without parameters", () => {
    expect(parseMapFilters({})).toEqual({
      precio: undefined,
      cat: undefined,
      quien: undefined,
      barrio: undefined,
      soloHoy: false,
      lista: false,
    });
  });

  it("ignores unknown or malformed values instead of failing", () => {
    const filters = parseMapFilters({
      precio: "barato",
      cat: "<script>",
      quien: "todos",
      barrio: "../etc",
      solo: "manana",
      vista: "tabla",
    });
    expect(filters).toEqual(parseMapFilters({}));
  });

  it("takes the first value of a repeated parameter", () => {
    expect(parseMapFilters({ cat: ["arte", "musica"] }).cat).toBe("arte");
  });
});

describe("buildMapHref", () => {
  it("leaves out empty filters", () => {
    expect(buildMapHref("/", {})).toBe("/");
    expect(buildMapHref("/", { soloHoy: false, lista: false })).toBe("/");
  });

  it("round-trips through parseMapFilters", () => {
    const filters = parseMapFilters({ precio: "pago", quien: "gente", barrio: "vista-alegre", solo: "hoy" });
    const href = buildMapHref("/", filters);
    expect(href).toBe("/?precio=pago&quien=gente&barrio=vista-alegre&solo=hoy");
    const params = Object.fromEntries(new URL(href, "http://localhost").searchParams);
    expect(parseMapFilters(params)).toEqual(filters);
  });
});

describe("hasEventFilters", () => {
  it("is false for the plain map and the list view alone", () => {
    expect(hasEventFilters(parseMapFilters({ vista: "lista" }))).toBe(false);
  });

  it("is true when any filter or Solo hoy is on", () => {
    expect(hasEventFilters(parseMapFilters({ solo: "hoy" }))).toBe(true);
    expect(hasEventFilters(parseMapFilters({ barrio: "opanel" }))).toBe(true);
  });
});
