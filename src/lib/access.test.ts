import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const { resolveAccessState } = await import("./access");

describe("resolveAccessState", () => {
  it("sends the demo site back to the map, whatever the keys", () => {
    expect(resolveAccessState({ demo: true, siteKey: "key", serverEnvReady: true })).toBe("demo");
    expect(resolveAccessState({ demo: true, siteKey: undefined, serverEnvReady: false })).toBe("demo");
  });

  it("is unavailable without the Turnstile site key or the server secrets", () => {
    expect(resolveAccessState({ demo: false, siteKey: undefined, serverEnvReady: true })).toBe("unavailable");
    expect(resolveAccessState({ demo: false, siteKey: "", serverEnvReady: true })).toBe("unavailable");
    expect(resolveAccessState({ demo: false, siteKey: "key", serverEnvReady: false })).toBe("unavailable");
  });

  it("is available when everything is set", () => {
    expect(resolveAccessState({ demo: false, siteKey: "key", serverEnvReady: true })).toBe("available");
  });
});
