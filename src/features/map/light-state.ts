import { getMadridDateKey } from "@/lib/dates";
import type { LightState } from "./types";

/**
 * The Hoy map shows only events, in two states (docs/SPEC.md §4):
 * - `pulse`: happening today in Madrid and not over yet (an event that started yesterday and is still on counts);
 * - `lit`: in the next 7 days.
 * Ended events never reach this function: the view and filterEvents drop them.
 */
export function getLightState(event: { startsAt: string; endsAt: string }, now: Date): LightState {
  const startsBeforeTomorrow = getMadridDateKey(event.startsAt) <= getMadridDateKey(now);
  const notOver = new Date(event.endsAt).getTime() > now.getTime();
  return startsBeforeTomorrow && notOver ? "pulse" : "lit";
}
