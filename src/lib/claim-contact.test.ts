import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const { buildClaimMailto, getClaimContactHref } = await import("./claim-contact");
const { brand } = await import("@/config/brand");

describe("buildClaimMailto", () => {
  it("encodes the subject so a name cannot add recipients or a body", () => {
    const href = buildClaimMailto("hola@example.org", "¿Es mi asociación? · A&B?cc=x@y.es");
    expect(href.startsWith("mailto:hola@example.org?subject=")).toBe(true);
    expect(href).not.toContain("&");
    expect(href.match(/\?/g)).toHaveLength(1);
  });
});

describe("getClaimContactHref", () => {
  it("always points to the project contact channel", () => {
    expect(getClaimContactHref("Colectivo de prueba").startsWith(`mailto:${brand.contactEmail}?subject=`)).toBe(true);
    expect(getClaimContactHref().startsWith(`mailto:${brand.contactEmail}?subject=`)).toBe(true);
  });

  it("puts the public name in the subject, never anything else", () => {
    const subject = decodeURIComponent(getClaimContactHref("Colectivo de prueba").split("?subject=")[1] ?? "");
    expect(subject).toContain("Colectivo de prueba");
  });
});
