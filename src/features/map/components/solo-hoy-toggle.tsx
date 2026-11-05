import Link from "next/link";
import { t } from "@/lib/i18n/t";
import { buildMapHref, type MapFilters } from "../schema";

/** L'interruttore "Solo hoy". È un link, così funziona senza JS e lo stato resta nell'URL (?solo=hoy). */
export function SoloHoyToggle({ filters }: { filters: MapFilters }) {
  const on = filters.soloHoy;
  return (
    <Link
      href={buildMapHref("/", { ...filters, soloHoy: !on })}
      role="switch"
      aria-checked={on}
      aria-label={on ? t("hoy.soloHoy.on") : t("hoy.soloHoy.off")}
      className="inline-flex min-h-11 items-center gap-2 rounded-pill border border-line bg-surface px-4 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-light aria-checked:border-light"
    >
      <span aria-hidden="true" className={`flex h-5 w-9 items-center rounded-pill p-0.5 ${on ? "bg-light" : "bg-line"}`}>
        <span className={`size-4 rounded-pill bg-ink ${on ? "ml-auto" : ""}`} />
      </span>
      {t("hoy.soloHoy.label")}
    </Link>
  );
}
