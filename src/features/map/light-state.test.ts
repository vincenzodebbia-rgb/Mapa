import { describe, expect, it } from "vitest";
import { getLightState } from "./light-state";

// July: Madrid is UTC+2. "now" is Thursday 16 July 2026, 18:00 in Madrid.
const now = new Date("2026-07-16T16:00:00Z");

describe("getLightState", () => {
  it("is pulse for an event later today", () => {
    expect(getLightState({ startsAt: "2026-07-16T19:00:00Z", endsAt: "2026-07-16T21:00:00Z" }, now)).toBe("pulse");
  });

  it("is pulse for an event happening right now", () => {
    expect(getLightState({ startsAt: "2026-07-16T15:00:00Z", endsAt: "2026-07-16T17:00:00Z" }, now)).toBe("pulse");
  });

  it("is pulse for an event that started yesterday and is still on", () => {
    expect(getLightState({ startsAt: "2026-07-15T20:00:00Z", endsAt: "2026-07-16T18:00:00Z" }, now)).toBe("pulse");
  });

  it("uses the Madrid day, not the UTC day: 00:30 tomorrow in Madrid is not today", () => {
    // 22:30 UTC on the 16th = 00:30 on the 17th in Madrid.
    expect(getLightState({ startsAt: "2026-07-16T22:30:00Z", endsAt: "2026-07-17T00:30:00Z" }, now)).toBe("lit");
  });

  it("is lit for an event in the next days", () => {
    expect(getLightState({ startsAt: "2026-07-20T17:00:00Z", endsAt: "2026-07-20T19:00:00Z" }, now)).toBe("lit");
  });

  it("never returns faint: there is no third state on the Hoy map", () => {
    const states = new Set(
      ["2026-07-16T19:00:00Z", "2026-07-18T19:00:00Z", "2026-07-22T19:00:00Z"].map((startsAt) =>
        getLightState({ startsAt, endsAt: "2026-07-23T00:00:00Z" }, now),
      ),
    );
    expect([...states].sort()).toEqual(["lit", "pulse"]);
  });
});
