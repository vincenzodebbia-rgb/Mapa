import Form from "next/form";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { t } from "@/lib/i18n/t";
import { buildMapHref, EVENT_CATEGORIES, PRICE_FILTERS, type MapFilters, type OrganizerFilter } from "../schema";
import type { MapNeighborhood } from "../types";

const ORGANIZER_OPTIONS: OrganizerFilter[] = ["asociaciones", "espacios", "gente"];
const PRICE_LABELS = { gratis: "hoy.filters.free", pago: "hoy.filters.paid" } as const;

type MapFiltersFormProps = {
  filters: MapFilters;
  neighborhoods: MapNeighborhood[];
};

/**
 * GET form: filters go into the URL. next/form navigates on the client when JS is there,
 * and stays a plain form without it. Categories have no colors (docs/SPEC.md §4).
 */
export function MapFiltersForm({ filters, neighborhoods }: MapFiltersFormProps) {
  const fieldClass = "flex flex-col gap-1 text-sm";

  return (
    <details className="rounded-card border border-line bg-night/90 p-3">
      <summary className="cursor-pointer text-sm font-semibold focus-visible:outline-2 focus-visible:outline-light">
        {t("hoy.filters.title")}
      </summary>
      {/* key: a new URL remounts the form, so the selects show the active filters after navigation. */}
      <Form key={buildMapHref("/", filters)} action="/" className="mt-3 grid gap-3 sm:grid-cols-2">
        <label className={fieldClass}>
          {t("hoy.filters.price")}
          <Select name="precio" defaultValue={filters.precio ?? ""}>
            <option value="">{t("hoy.filters.priceAll")}</option>
            {PRICE_FILTERS.map((value) => (
              <option key={value} value={value}>
                {t(PRICE_LABELS[value])}
              </option>
            ))}
          </Select>
        </label>
        <label className={fieldClass}>
          {t("hoy.filters.category")}
          <Select name="cat" defaultValue={filters.cat ?? ""}>
            <option value="">{t("hoy.filters.categoryAll")}</option>
            {EVENT_CATEGORIES.map((value) => (
              <option key={value} value={value}>
                {t(`hoy.categories.${value}`)}
              </option>
            ))}
          </Select>
        </label>
        <label className={fieldClass}>
          {t("hoy.filters.organizer")}
          <Select name="quien" defaultValue={filters.quien ?? ""}>
            <option value="">{t("hoy.filters.organizerAll")}</option>
            {ORGANIZER_OPTIONS.map((value) => (
              <option key={value} value={value}>
                {t(`hoy.organizers.${value}`)}
              </option>
            ))}
          </Select>
        </label>
        <label className={fieldClass}>
          {t("hoy.filters.neighborhood")}
          <Select name="barrio" defaultValue={filters.barrio ?? ""} aria-describedby="barrio-hint">
            <option value="">{t("hoy.filters.neighborhoodAll")}</option>
            {neighborhoods.map((neighborhood) => (
              <option key={neighborhood.slug} value={neighborhood.slug}>
                {neighborhood.name}
              </option>
            ))}
          </Select>
          <span id="barrio-hint" className="text-muted">
            {t("hoy.filters.neighborhoodHint")}
          </span>
        </label>
        {filters.soloHoy && <input type="hidden" name="solo" value="hoy" />}
        {filters.lista && <input type="hidden" name="vista" value="lista" />}
        <div className="flex flex-wrap items-center gap-3 sm:col-span-2">
          <Button type="submit">{t("hoy.filters.apply")}</Button>
          <Link
            href={buildMapHref("/", { soloHoy: filters.soloHoy, lista: filters.lista })}
            className="text-sm underline focus-visible:outline-2 focus-visible:outline-light"
          >
            {t("hoy.filters.clear")}
          </Link>
        </div>
      </Form>
    </details>
  );
}
