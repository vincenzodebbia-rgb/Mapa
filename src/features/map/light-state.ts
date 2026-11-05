import { getMadridDateKey } from "@/lib/dates";
import type { LightState } from "./types";

/**
 * La mappa Hoy mostra solo eventi, in due stati (docs/SPEC.md §4):
 * - `pulse`: succede oggi a Madrid e non è ancora finito (conta anche un evento iniziato ieri e ancora in corso);
 * - `lit`: nei prossimi 7 giorni.
 * Gli eventi finiti non arrivano mai a questa funzione: li scartano la vista e filterEvents.
 */
export function getLightState(event: { startsAt: string; endsAt: string }, now: Date): LightState {
  const startsBeforeTomorrow = getMadridDateKey(event.startsAt) <= getMadridDateKey(now);
  const notOver = new Date(event.endsAt).getTime() > now.getTime();
  return startsBeforeTomorrow && notOver ? "pulse" : "lit";
}
