import Link from "next/link";
import { t } from "@/lib/i18n/t";
import { buildMapHref, type MapFilters } from "../schema";

/** "Ver lista" / "Ver mapa": the list is the accessible equivalent of every map, with the same filters. */
export function ViewToggle({ pathname, filters }: { pathname: string; filters: MapFilters }) {
  return (
    <Link
      href={buildMapHref(pathname, { ...filters, lista: !filters.lista })}
      className="inline-flex min-h-11 items-center rounded-pill border border-line bg-surface px-4 text-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-light"
    >
      {filters.lista ? t("map.view.map") : t("map.view.list")}
    </Link>
  );
}
