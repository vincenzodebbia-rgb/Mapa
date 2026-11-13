import { getLightState } from "./light-state";
import { ORGANIZER_FILTERS, type MapFilters } from "./schema";
import type { MapEvent } from "./types";

type FilterOptions = {
  /** Il filtro del barrio restringe la vista elenco; sulla mappa centra solo la vista (docs/SPEC.md §4). */
  byNeighborhood: boolean;
};

/** Eventi che rispettano i filtri dell'URL, in ordine di inizio. */
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
