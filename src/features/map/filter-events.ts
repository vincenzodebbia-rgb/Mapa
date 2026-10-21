import { getLightState } from "./light-state";
import { ORGANIZER_FILTERS, type MapFilters } from "./schema";
import type { MapEvent } from "./types";

type FilterOptions = {
  /** The barrio filter narrows the list view; on the map it only centers the view (docs/SPEC.md §4). */
  byNeighborhood: boolean;
};

/** Events that match the URL filters, sorted by start time. */
export function filterEvents(events: MapEvent[], filters: MapFilters, now: Date, options: FilterOptions): MapEvent[] {
  const organizerKind = filters.quien ? ORGANIZER_FILTERS[filters.quien] : undefined;

  return events
    .filter((event) => new Date(event.endsAt).getTime() > now.getTime())
    .filter((event) => {
      if (filters.precio === "gratis" && event.priceType === "paid") return false;
      if (filters.precio === "pago" && event.priceType !== "paid") return false;
      if (filters.cat && event.category !== filters.cat) return false;
      if (organizerKind && !event.organizerKinds.includes(organizerKind)) return false;
      if (options.byNeighborhood && filters.barrio && event.neighborhoodSlug !== filters.barrio) return false;
      if (filters.soloHoy && getLightState(event, now) !== "pulse") return false;
      return true;
    })
    .toSorted((a, b) => a.startsAt.localeCompare(b.startsAt) || a.title.localeCompare(b.title, "es"));
}
