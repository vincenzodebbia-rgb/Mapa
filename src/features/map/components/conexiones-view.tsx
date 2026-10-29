import { brand } from "@/config/brand";
import { t } from "@/lib/i18n/t";
import { toPlacePopup } from "../describe-items";
import type { MapFilters } from "../schema";
import { placesToGeoJson } from "../to-geojson";
import type { MapPlace } from "../types";
import { MapNotice } from "./map-notice";
import { MapSwitch } from "./map-switch";
import { MapViewLoader } from "./map-view-loader";
import { PlaceList } from "./place-list";
import { ViewToggle } from "./view-toggle";

/**
 * The Conexiones map, before launch: who is here. Active associations and venues with an address,
 * each a lit point with its name on tap. No threads until the `threads` flag is on (docs/SPEC.md §6).
 */
export function ConexionesView({ places, filters }: { places: MapPlace[]; filters: MapFilters }) {
  const notice = places.length === 0 ? <MapNotice message={t("conexiones.empty")} /> : null;

  return (
    <main className="flex h-app flex-col">
      <header className="flex flex-col gap-2 p-3">
        <div className="flex flex-wrap items-center gap-2">
          <MapSwitch current="conexiones" />
          <ViewToggle pathname="/conexiones" filters={filters} />
        </div>
        <h1 className="text-lg font-semibold">{t("conexiones.heading")}</h1>
        <p className="text-sm text-muted">{t("conexiones.intro")}</p>
      </header>

      {filters.lista ? (
        <div className="flex-1 overflow-y-auto">
          {notice && <div className="mx-auto w-full max-w-2xl px-4">{notice}</div>}
          <PlaceList places={places} />
        </div>
      ) : (
        <div className="relative flex-1">
          <MapViewLoader
            styleUrl={brand.mapStyleUrl}
            data={placesToGeoJson(places)}
            popups={Object.fromEntries(places.map((place) => [place.id, toPlacePopup(place)]))}
            bounds={null}
            label={t("conexiones.mapLabel")}
            loadingLabel={t("map.loading")}
          />
          {notice && <div className="absolute inset-x-3 top-3">{notice}</div>}
        </div>
      )}
    </main>
  );
}
