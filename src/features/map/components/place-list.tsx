import Link from "next/link";
import { t } from "@/lib/i18n/t";
import type { MapPlace } from "../types";

/** List view of the Conexiones map: the same associations and venues, sorted by name. */
export function PlaceList({ places }: { places: MapPlace[] }) {
  const heading = t("conexiones.list.heading");

  return (
    <section className="mx-auto flex w-full max-w-2xl flex-col gap-3 p-4">
      <h2 className="flex items-baseline justify-between gap-3 text-lg font-semibold">
        {heading}
        <span className="text-sm font-normal text-muted">
          {places.length === 1 ? t("conexiones.list.countOne") : t("conexiones.list.count", { count: places.length })}
        </span>
      </h2>
      <ol aria-label={heading} className="flex flex-col gap-3">
        {places.map((place) => (
          <li key={place.id} className="flex flex-col gap-1 rounded-card border border-line bg-surface p-4">
            <p className="text-sm text-muted">{t(`conexiones.kinds.${place.kind}`)}</p>
            <h3 className="text-base font-semibold">
              <Link
                href={`/a/${place.slug}`}
                className="underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-light"
              >
                {place.name}
              </Link>
            </h3>
            {place.address && <p className="text-sm">{place.address}</p>}
          </li>
        ))}
      </ol>
    </section>
  );
}
