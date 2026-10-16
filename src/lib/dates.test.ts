import { describe, expect, it } from "vitest";
import { formatMadridDate, formatMadridTime, getMadridDateKey } from "./dates";

describe("formatMadridTime", () => {
  it("uses CET (UTC+1) in winter", () => {
    expect(formatMadridTime("2026-01-15T18:30:00Z")).toBe("19:30");
  });

  it("uses CEST (UTC+2) in summer", () => {
    expect(formatMadridTime("2026-07-15T17:30:00Z")).toBe("19:30");
  });

  it("jumps from 01:59 to 03:00 when summer time starts (29 March 2026)", () => {
    expect(formatMadridTime("2026-03-29T00:59:00Z")).toBe("01:59");
    expect(formatMadridTime("2026-03-29T01:00:00Z")).toBe("03:00");
  });

  it("shows 02:30 twice when summer time ends (25 October 2026)", () => {
    expect(formatMadridTime("2026-10-25T00:30:00Z")).toBe("02:30");
    expect(formatMadridTime("2026-10-25T01:30:00Z")).toBe("02:30");
  });

  it("accepts Date objects", () => {
    expect(formatMadridTime(new Date("2026-01-15T18:30:00Z"))).toBe("19:30");
  });
});

describe("getMadridDateKey", () => {
  it("returns the Madrid day, not the UTC day, just after midnight", () => {
    expect(getMadridDateKey("2026-07-15T22:30:00Z")).toBe("2026-07-16");
    expect(getMadridDateKey("2026-01-15T23:30:00Z")).toBe("2026-01-16");
  });

  it("keeps the same day just before midnight", () => {
    expect(getMadridDateKey("2026-07-15T21:59:00Z")).toBe("2026-07-15");
  });
});

describe("formatMadridDate", () => {
  it("writes the date in Spanish", () => {
    expect(formatMadridDate("2026-07-16T10:00:00Z")).toBe("jueves, 16 de julio");
  });
});
