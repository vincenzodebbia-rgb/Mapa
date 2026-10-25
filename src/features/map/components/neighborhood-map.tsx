import { brand } from "@/config/brand";
import { t } from "@/lib/i18n/t";
import { toEventPopup, toPlacePopup } from "../describe-items";
import { neighborhoodToGeoJson } from "../to-geojson";
import type { MapEvent, MapPlace, NeighborhoodPage } from "../types";
import { MapViewLoader } from "./map-view-loader";

type NeighborhoodMapProps = {
  neighborhood: NeighborhoodPage;
  events: MapEvent[];
  places: MapPlace[];
  /** Time of the cached read the items come from (ISO). */
  now: string;
};

/**
 * The map of a barrio page, centered on it: its events of the next 7 days (pulse/lit) and its associations
 * and venues (lit). The same lists are on the page as text, so the map is never the only way in.
 */
export function NeighborhoodMap({ neighborhood, events, places, now }: NeighborhoodMapProps) {
  const at = new Date(now);
  return (
    <div className="relative h-72 overflow-hidden rounded-card border border-line">
      <MapViewLoader
        styleUrl={brand.mapStyleUrl}
        data={neighborhoodToGeoJson(events, places, at)}
        popups={Object.fromEntries([
          ...events.map((event) => [event.key, toEventPopup(event, at)] as const),
          ...places.map((place) => [place.id, toPlacePopup(place)] as const),
        ])}
        bounds={neighborhood.bounds}
        label={t("barrio.mapLabel", { name: neighborhood.name })}
        loadingLabel={t("map.loading")}
      />
    </div>
  );
}
