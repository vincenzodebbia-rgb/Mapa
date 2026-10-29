import { afterEach, describe, expect, it, vi } from "vitest";
import { isDemoValue } from "./flags";

describe("demo flag", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("is on only for the exact value \"1\"", () => {
    expect(isDemoValue("1")).toBe(true);
    for (const value of [undefined, "", "0", "true", "yes", " 1", "1 "]) {
      expect(isDemoValue(value), String(value)).toBe(false);
    }
  });

  it("reads NEXT_PUBLIC_DEMO", async () => {
    vi.stubEnv("NEXT_PUBLIC_DEMO", "1");
    expect((await import("./flags")).flags.demo).toBe(true);
    vi.resetModules();
    vi.stubEnv("NEXT_PUBLIC_DEMO", undefined);
    expect((await import("./flags")).flags.demo).toBe(false);
  });
});
