import { describe, expect, it } from "vitest";
import { getDefaultSchedule, getPublishedEventHref, mapEventDbError, parseEventForm, parsePriceAmount } from "./schema";

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
  });

  it("refuses an end time equal to the start time (decision A)", () => {
    expect(parseEventForm({ ...base, startTime: "19:00", endTime: "19:00" }, NOW)).toEqual({
      ok: false,
      fieldErrors: { endTime: "sameTime" },
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

describe("parseEventForm in update mode", () => {
  // Serie settimanale cominciata il 30 ottobre, ancora in corso fino a gennaio.
  const series = { ...base, date: "2026-10-30", recurrence: "weekly", recurrenceUntil: "2027-01-29" };

  it("judges a series by its last day: a running series can change time", () => {
    expect(parseEventForm(series, NOW).ok).toBe(false);
    const updated = parseEventForm({ ...series, startTime: "18:00" }, NOW, { mode: "update" });
    expect(updated.ok && updated.value.startsAt).toBe("2026-10-30T17:00:00.000Z");
  });

  it("refuses to end a series in the past, and a single event stays judged by its end", () => {
    expect(parseEventForm({ ...series, recurrenceUntil: "2026-11-06" }, NOW, { mode: "update" })).toEqual({
      ok: false,
      fieldErrors: { recurrenceUntil: "inPast" },
    });
    expect(parseEventForm({ ...base, date: "2026-11-12" }, NOW, { mode: "update" })).toEqual({
      ok: false,
      fieldErrors: { date: "inPast" },
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
    expect(mapEventDbError({ message: 'new row violates check constraint "events_end_differs_from_start"' })).toEqual({
      type: "field",
      field: "endTime",
      error: "sameTime",
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

describe("getDefaultSchedule", () => {
  it("proposes today 19:00–21:00 in the afternoon", () => {
    expect(getDefaultSchedule(new Date("2026-11-13T10:00:00Z"))).toEqual({ date: "2026-11-13", startTime: "19:00", endTime: "21:00" });
  });

  it("starts at the next full hour in the evening, even across midnight", () => {
    expect(getDefaultSchedule(new Date("2026-11-13T20:15:00Z"))).toEqual({ date: "2026-11-13", startTime: "22:00", endTime: "00:00" });
  });

  it("moves to tomorrow late at night", () => {
    expect(getDefaultSchedule(new Date("2026-11-13T22:30:00Z"))).toEqual({ date: "2026-11-14", startTime: "19:00", endTime: "21:00" });
  });

  it("never proposes something already over", () => {
    for (const iso of ["2026-11-13T10:00:00Z", "2026-11-13T18:59:00Z", "2026-11-13T22:59:00Z"]) {
      const now = new Date(iso);
      const schedule = getDefaultSchedule(now);
      expect(parseEventForm({ ...base, ...schedule }, now).ok, iso).toBe(true);
    }
  });
});
