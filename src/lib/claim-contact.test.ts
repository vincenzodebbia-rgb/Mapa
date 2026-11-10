import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const { buildClaimMailto, getClaimContactHref } = await import("./claim-contact");
const { brand } = await import("@/config/brand");

function subjectOf(href: string): string {
  return decodeURIComponent(href.split("?subject=")[1] ?? "");
}

describe("buildClaimMailto", () => {
  it("encodes the subject so a name cannot add recipients or a body", () => {
    const href = buildClaimMailto("hola@example.org", "¿Es mi asociación? · A&B?cc=x@y.es");
    expect(href.startsWith("mailto:hola@example.org?subject=")).toBe(true);
    expect(href).not.toContain("&");
    expect(href.match(/\?/g)).toHaveLength(1);
  });
});

describe("getClaimContactHref", () => {
  it("always points to the project contact channel, for every kind", () => {
    for (const kind of ["association", "venue", "professional"] as const) {
      expect(getClaimContactHref(kind, "Prueba").startsWith(`mailto:${brand.contactEmail}?subject=`)).toBe(true);
    }
    expect(getClaimContactHref("association").startsWith(`mailto:${brand.contactEmail}?subject=`)).toBe(true);
  });

  it("uses a subject that fits the kind, with the public name only", () => {
    expect(subjectOf(getClaimContactHref("association", "Colectivo de prueba"))).toBe("¿Es mi asociación? · Colectivo de prueba");
    expect(subjectOf(getClaimContactHref("venue", "Librería de prueba"))).toBe("¿Es mi espacio? · Librería de prueba");
    expect(subjectOf(getClaimContactHref("professional", "Estudio de prueba"))).toBe("¿Es mi perfil? · Estudio de prueba");
  });

  it("never contains a NIF when there is no name (NIF already registered)", () => {
    expect(subjectOf(getClaimContactHref("venue"))).not.toMatch(/[A-Z]\d{7}[0-9A-J]/);
  });
});
