import { t } from "@/lib/i18n/t";

/** Small, closable legend with the two light states of the Hoy map. */
export function MapLegend() {
  return (
    <details open className="max-w-60 rounded-card border border-line bg-night/90 p-2 text-xs">
      <summary className="cursor-pointer font-semibold focus-visible:outline-2 focus-visible:outline-light">
        {t("hoy.legend.title")}
      </summary>
      <ul className="mt-2 flex flex-col gap-2">
        <li className="flex items-start gap-2">
          <span aria-hidden="true" className="relative mt-1 flex size-3 shrink-0">
            <span className="absolute inline-flex size-full animate-ping rounded-pill bg-light opacity-60" />
            <span className="relative inline-flex size-3 rounded-pill bg-light" />
          </span>
          {t("hoy.legend.pulse")}
        </li>
        <li className="flex items-start gap-2">
          <span aria-hidden="true" className="mt-1 inline-flex size-3 shrink-0 rounded-pill bg-light" />
          {t("hoy.legend.lit")}
        </li>
        <li className="text-muted">{t("hoy.legend.soloHoy")}</li>
      </ul>
    </details>
  );
}
