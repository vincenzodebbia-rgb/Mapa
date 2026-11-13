import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("next/headers", () => ({ headers: async () => new Headers() }));

const { hashForRateLimit, readClientIp } = await import("./rate-limit");

describe("hashForRateLimit", () => {
  it("never contains the value and fits the rate_limits key column", () => {
    const hash = hashForRateLimit("203.0.113.7", "secret", "2026-11-04");
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
    expect(hash).not.toContain("203");
  });

  it("is stable within a day and ignores case and spaces (emails)", () => {
    expect(hashForRateLimit(" Ana@Example.org ", "s", "2026-11-04")).toBe(hashForRateLimit("ana@example.org", "s", "2026-11-04"));
  });

  it("changes with the day and with the secret", () => {
    const base = hashForRateLimit("203.0.113.7", "s", "2026-11-04");
    expect(hashForRateLimit("203.0.113.7", "s", "2026-11-05")).not.toBe(base);
    expect(hashForRateLimit("203.0.113.7", "other", "2026-11-04")).not.toBe(base);
  });
});

describe("readClientIp", () => {
  it("takes the first address of x-forwarded-for", () => {
    expect(readClientIp(new Headers({ "x-forwarded-for": "203.0.113.7, 10.0.0.1" }))).toBe("203.0.113.7");
  });

  it("falls back to x-real-ip, then to a fixed value", () => {
    expect(readClientIp(new Headers({ "x-real-ip": "198.51.100.2" }))).toBe("198.51.100.2");
    expect(readClientIp(new Headers())).toBe("unknown");
  });
});
