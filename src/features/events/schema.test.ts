import { describe, expect, it } from "vitest";
import { getPublishedEventHref, mapEventDbError, parseEventForm, parsePriceAmount } from "./schema";

// 13 novembre 2026, 18:00 a Madrid (UTC+1).
const NOW = new Date("2026-11-13T17:00:00Z");

const base = {
  title: "Concierto de prueba",
  category: "musica",
  priceType: "free",
  date: "2026-11-20",
  startTime: "19:00",
  endTime: "21:00",
  recurrence: "none",
  address: "Calle Inventada 1",
};

describe("parseEventForm", () => {
  it("accepts a minimal event and converts Madrid times to UTC", () => {
    const result = parseEventForm(base, NOW);
    expect(result).toEqual({
      ok: true,
      value: {
        title: "Concierto de prueba",
        category: "musica",
        priceType: "free",
        priceAmount: null,
        startsAt: "2026-11-20T18:00:00.000Z",
        endsAt: "2026-11-20T20:00:00.000Z",
        recurrence: "none",
        recurrenceUntil: null,
        address: "Calle Inventada 1",
        venueName: null,
        description: null,
        point: null,
      },
    });
  });

  it("keeps a title with HTML as plain text", () => {
    const result = parseEventForm({ ...base, title: "<img src=x onerror=alert(1)>" }, NOW);
    expect(result.ok && result.value.title).toBe("<img src=x onerror=alert(1)>");
  });

  it("moves an end time before the start to the next day (D5)", () => {
    const result = parseEventForm({ ...base, startTime: "22:00", endTime: "04:00" }, NOW);
    expect(result.ok && [result.value.startsAt, result.value.endsAt]).toEqual([
      "2026-11-20T21:00:00.000Z",
      "2026-11-21T03:00:00.000Z",
    ]);
  });

  it("refuses an event that is already over (D4), but accepts one still going on", () => {
    expect(parseEventForm({ ...base, date: "2026-11-12" }, NOW)).toEqual({ ok: false, fieldErrors: { date: "inPast" } });
    expect(parseEventForm({ ...base, date: "2026-11-13", startTime: "10:00", endTime: "12:00" }, NOW)).toEqual({
      ok: false,
      fieldErrors: { date: "inPast" },
    });
    // 22:00 di ieri → 04:00 di oggi, alle 02:00 di oggi: ancora in corso.
    const lateNight = new Date("2026-11-13T01:00:00Z");
    expect(parseEventForm({ ...base, date: "2026-11-12", startTime: "22:00", endTime: "04:00" }, lateNight).ok).toBe(true);
  });

  it("refuses times that do not exist when summer time starts, and more than 24 real hours", () => {
    const spring = new Date("2026-03-01T00:00:00Z");
    expect(parseEventForm({ ...base, date: "2026-03-29", startTime: "02:30", endTime: "04:00" }, spring)).toEqual({
      ok: false,
      fieldErrors: { startTime: "nonexistentTime" },
    });
    // Notte del 25 ottobre: 03:00 → 03:00 del giorno dopo sono 25 ore reali.
    const autumn = new Date("2026-10-01T00:00:00Z");
    expect(parseEventForm({ ...base, date: "2026-10-24", startTime: "03:00", endTime: "03:00" }, autumn)).toEqual({
      ok: false,
      fieldErrors: { endTime: "tooLongDuration" },
    });
  });

  it("asks for a price only when the event is paid", () => {
    expect(parseEventForm({ ...base, priceType: "paid" }, NOW)).toEqual({ ok: false, fieldErrors: { priceAmount: "required" } });
    expect(parseEventForm({ ...base, priceType: "paid", priceAmount: "-3" }, NOW)).toEqual({
      ok: false,
      fieldErrors: { priceAmount: "invalidPrice" },
    });
    const paid = parseEventForm({ ...base, priceType: "paid", priceAmount: "5,50" }, NOW);
    expect(paid.ok && paid.value.priceAmount).toBe(5.5);
    const free = parseEventForm({ ...base, priceType: "free", priceAmount: "9" }, NOW);
    expect(free.ok && free.value.priceAmount).toBeNull();
  });

  it("checks the end of a repetition: from the start day to 6 months later", () => {
    expect(parseEventForm({ ...base, recurrence: "weekly" }, NOW)).toEqual({
      ok: false,
      fieldErrors: { recurrenceUntil: "required" },
    });
    expect(parseEventForm({ ...base, recurrence: "weekly", recurrenceUntil: "2027-05-21" }, NOW)).toEqual({
      ok: false,
      fieldErrors: { recurrenceUntil: "invalidRecurrenceUntil" },
    });
    const weekly = parseEventForm({ ...base, recurrence: "weekly", recurrenceUntil: "2027-05-20" }, NOW);
    expect(weekly.ok && weekly.value.recurrenceUntil).toBe("2027-05-20");
  });

  it("reports missing and too long fields on the right field", () => {
    const result = parseEventForm({ ...base, title: " ", category: "", address: "", description: "x".repeat(501) }, NOW);
    expect(result).toEqual({
      ok: false,
      fieldErrors: { title: "required", category: "required", address: "required", description: "tooLong" },
    });
  });

  it("accepts a pin inside the Comunidad de Madrid and refuses one outside", () => {
    const inside = parseEventForm({ ...base, lng: "-3.70", lat: "40.41" }, NOW);
    expect(inside.ok && inside.value.point).toEqual({ lng: -3.7, lat: 40.41 });
    expect(parseEventForm({ ...base, lng: "2.17", lat: "41.38" }, NOW)).toEqual({
      ok: false,
      fieldErrors: { address: "invalidLocation" },
    });
  });
});

describe("parsePriceAmount", () => {
  it("reads euros with comma or dot and at most two decimals", () => {
    expect(parsePriceAmount("12")).toBe(12);
    expect(parsePriceAmount("0")).toBe(0);
    expect(parsePriceAmount("3.333")).toBeNull();
    expect(parsePriceAmount("1000000")).toBeNull();
    expect(parsePriceAmount("abc")).toBeNull();
  });
});

describe("mapEventDbError", () => {
  it("turns database errors into field or form errors", () => {
    expect(mapEventDbError({ message: "event_in_past" })).toEqual({ type: "field", field: "date", error: "inPast" });
    expect(mapEventDbError({ message: "rate_limited" })).toEqual({ type: "form", error: "tooMany" });
    expect(mapEventDbError({ message: 'new row violates check constraint "events_duration"' })).toEqual({
      type: "field",
      field: "endTime",
      error: "tooLongDuration",
    });
    expect(mapEventDbError({ message: "new row violates row-level security policy", code: "42501" })).toEqual({
      type: "form",
      error: "notAllowed",
    });
    expect(mapEventDbError({ message: "something else" })).toEqual({ type: "form", error: "generic" });
  });
});

describe("getPublishedEventHref (D8)", () => {
  it("opens the Hoy map for an event of today and the event page for a future one", () => {
    expect(getPublishedEventHref("hoy", "2026-11-13T19:00:00Z", "2026-11-13T21:00:00Z", NOW)).toBe("/?evento=hoy");
    expect(getPublishedEventHref("manana", "2026-11-14T19:00:00Z", "2026-11-14T21:00:00Z", NOW)).toBe("/e/manana");
    // Iniziato ieri alle 22:00 e ancora in corso: è di oggi sulla mappa.
    const lateNight = new Date("2026-11-14T01:00:00Z");
    expect(getPublishedEventHref("noche", "2026-11-13T21:00:00Z", "2026-11-14T03:00:00Z", lateNight)).toBe("/?evento=noche");
  });
});
