import { brand } from "@/config/brand";
import { t } from "@/lib/i18n/t";
import { toEventPopup } from "../describe-items";
import { filterEvents } from "../filter-events";
import { hasEventFilters, type MapFilters } from "../schema";
import { eventsToGeoJson } from "../to-geojson";
import type { MapEvent, MapNeighborhood } from "../types";
import { EventList } from "./event-list";
import { MapFiltersForm } from "./map-filters";
import { MapLegend } from "./map-legend";
import { MapNotice } from "./map-notice";
import { MapSwitch } from "./map-switch";
import { MapViewLoader } from "./map-view-loader";
import { SoloHoyToggle } from "./solo-hoy-toggle";
import { ViewToggle } from "./view-toggle";

type HoyViewProps = {
  events: MapEvent[];
  neighborhoods: MapNeighborhood[];
  filters: MapFilters;
  now: Date;
};

function getEmptyMessage(filters: MapFilters): string {
  const onlySoloHoy = filters.soloHoy && !filters.precio && !filters.cat && !filters.quien && !filters.barrio;
  if (onlySoloHoy) return t("hoy.empty.today");
  return hasEventFilters(filters) ? t("hoy.empty.filtered") : t("hoy.empty.week");
}

/** The Hoy map (`/`): only events, `pulse` today and `lit` in the next 7 days (docs/SPEC.md §4). */
export function HoyView({ events, neighborhoods, filters, now }: HoyViewProps) {
  const mapEvents = filterEvents(events, filters, now, { byNeighborhood: false });
  const listEvents = filterEvents(events, filters, now, { byNeighborhood: true });
  const shown = filters.lista ? listEvents : mapEvents;
  const notice = shown.length === 0 ? <MapNotice message={getEmptyMessage(filters)} /> : null;
  const bounds = neighborhoods.find((neighborhood) => neighborhood.slug === filters.barrio)?.bounds ?? null;

  return (
    <main className="flex h-app flex-col">
      <header className="flex flex-col gap-2 p-3">
        <h1 className="sr-only">{t("hoy.heading")}</h1>
        <div className="flex flex-wrap items-center gap-2">
          <MapSwitch current="hoy" />
          <SoloHoyToggle filters={filters} />
          <ViewToggle pathname="/" filters={filters} />
        </div>
        <MapFiltersForm filters={filters} neighborhoods={neighborhoods} />
      </header>

      {filters.lista ? (
        <div className="flex-1 overflow-y-auto">
          {notice && <div className="mx-auto w-full max-w-2xl px-4">{notice}</div>}
          <EventList events={listEvents} now={now} />
        </div>
      ) : (
        <div className="relative flex-1">
          <MapViewLoader
            styleUrl={brand.mapStyleUrl}
            data={eventsToGeoJson(mapEvents, now)}
            popups={Object.fromEntries(mapEvents.map((event) => [event.key, toEventPopup(event, now)]))}
            bounds={bounds}
            label={t("hoy.mapLabel")}
            loadingLabel={t("map.loading")}
          />
          <div className="absolute inset-x-3 top-3 flex flex-col items-end gap-2">
            <MapLegend />
            {notice}
          </div>
        </div>
      )}
    </main>
  );
}
