import { describe, expect, it } from "vitest";
import { isEventIndexable, shouldRedirectEvent } from "./event-page-rules";

const lastEnd = "2026-11-10T20:00:00.000Z";

describe("shouldRedirectEvent", () => {
  it("does not redirect before or during the 7 days after the last occurrence", () => {
    expect(shouldRedirectEvent(lastEnd, new Date("2026-11-10T19:00:00.000Z"))).toBe(false);
    expect(shouldRedirectEvent(lastEnd, new Date("2026-11-17T19:59:59.999Z"))).toBe(false);
  });

  it("redirects from exactly 7 days after the end", () => {
    expect(shouldRedirectEvent(lastEnd, new Date("2026-11-17T20:00:00.000Z"))).toBe(true);
    expect(shouldRedirectEvent(lastEnd, new Date("2027-01-01T00:00:00.000Z"))).toBe(true);
  });
});

describe("isEventIndexable", () => {
  it("is indexable only until the last occurrence ends", () => {
    expect(isEventIndexable(lastEnd, new Date("2026-11-10T19:59:00.000Z"))).toBe(true);
    expect(isEventIndexable(lastEnd, new Date("2026-11-10T20:00:00.000Z"))).toBe(false);
  });
});
