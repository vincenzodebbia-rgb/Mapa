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
  /** Ora della lettura in cache da cui vengono gli elementi (ISO). */
  now: string;
};

/**
 * La mappa di una pagina di barrio, centrata su di lui: i suoi eventi dei prossimi 7 giorni (pulse/lit) e le sue
 * associazioni ed espacios (lit). Gli stessi elenchi sono nella pagina come testo, così la mappa non è mai l'unica via.
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
