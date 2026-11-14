import { describe, expect, it } from "vitest";
import { addDaysToDateKey, addMonthsToDateKey, formatMadridDate, formatMadridTime, getMadridDateKey, madridLocalToInstant } from "./dates";

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

describe("madridLocalToInstant", () => {
  it("converts winter and summer times", () => {
    expect(madridLocalToInstant("2026-01-15", "19:30")).toEqual({ ok: true, iso: "2026-01-15T18:30:00.000Z" });
    expect(madridLocalToInstant("2026-07-15", "19:30")).toEqual({ ok: true, iso: "2026-07-15T17:30:00.000Z" });
  });

  it("refuses a time that does not exist when summer time starts (29 March 2026)", () => {
    expect(madridLocalToInstant("2026-03-29", "02:30")).toEqual({ ok: false, error: "nonexistent" });
    expect(madridLocalToInstant("2026-03-29", "01:59")).toEqual({ ok: true, iso: "2026-03-29T00:59:00.000Z" });
    expect(madridLocalToInstant("2026-03-29", "03:00")).toEqual({ ok: true, iso: "2026-03-29T01:00:00.000Z" });
  });

  it("takes the first of a time that happens twice when summer time ends (25 October 2026)", () => {
    expect(madridLocalToInstant("2026-10-25", "02:30")).toEqual({ ok: true, iso: "2026-10-25T00:30:00.000Z" });
    expect(madridLocalToInstant("2026-10-25", "03:30")).toEqual({ ok: true, iso: "2026-10-25T02:30:00.000Z" });
  });

  it("refuses malformed or impossible values", () => {
    expect(madridLocalToInstant("2026-02-30", "19:00")).toEqual({ ok: false, error: "invalid" });
    expect(madridLocalToInstant("2026-02-10", "24:00")).toEqual({ ok: false, error: "invalid" });
    expect(madridLocalToInstant("10/02/2026", "19:00")).toEqual({ ok: false, error: "invalid" });
  });
});

describe("addDaysToDateKey and addMonthsToDateKey", () => {
  it("moves on the calendar across months and years", () => {
    expect(addDaysToDateKey("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDaysToDateKey("2026-03-01", -1)).toBe("2026-02-28");
  });

  it("clamps to the last day of the month like Postgres", () => {
    expect(addMonthsToDateKey("2026-08-31", 6)).toBe("2027-02-28");
    expect(addMonthsToDateKey("2026-11-13", 6)).toBe("2027-05-13");
    expect(addMonthsToDateKey("2026-02-30", 6)).toBeNull();
  });
});
