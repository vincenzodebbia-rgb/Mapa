import { describe, expect, it } from "vitest";
import { buildNominatimSearchUrl, isInsideMadridRegion, normalizeGeocodeQuery, parseNominatimResponse } from "./geocode";

describe("normalizeGeocodeQuery", () => {
  it("lowercases, trims and collapses spaces", () => {
    expect(normalizeGeocodeQuery("  Calle  de   Atocha 12 ")).toBe("calle de atocha 12");
  });

  it("is capped at 300 characters", () => {
    expect(normalizeGeocodeQuery("a".repeat(400))).toHaveLength(300);
  });
});

describe("buildNominatimSearchUrl", () => {
  it("asks for one result bounded to the Comunidad de Madrid", () => {
    const url = new URL(buildNominatimSearchUrl("calle de atocha 12"));
    expect(url.hostname).toBe("nominatim.openstreetmap.org");
    expect(url.searchParams.get("q")).toBe("calle de atocha 12");
    expect(url.searchParams.get("limit")).toBe("1");
    expect(url.searchParams.get("bounded")).toBe("1");
    expect(url.searchParams.get("viewbox")).toBe("-4.6,41.2,-3,39.8");
  });
});

describe("parseNominatimResponse", () => {
  it("reads the first result inside the region", () => {
    expect(parseNominatimResponse([{ lat: "40.41", lon: "-3.70", display_name: "Calle de Atocha, Madrid" }])).toEqual({
      lng: -3.7,
      lat: 40.41,
      displayName: "Calle de Atocha, Madrid",
    });
  });

  it("skips results outside the Comunidad de Madrid", () => {
    expect(parseNominatimResponse([{ lat: "41.38", lon: "2.17", display_name: "Barcelona" }])).toBeNull();
  });

  it("returns null for no results or an unexpected answer", () => {
    expect(parseNominatimResponse([])).toBeNull();
    expect(parseNominatimResponse({ error: "x" })).toBeNull();
  });
});

describe("isInsideMadridRegion", () => {
  it("matches the box of private.make_org_point", () => {
    expect(isInsideMadridRegion(-3.7, 40.4)).toBe(true);
    expect(isInsideMadridRegion(-4.7, 40.4)).toBe(false);
    expect(isInsideMadridRegion(-3.7, 41.3)).toBe(false);
  });
});
