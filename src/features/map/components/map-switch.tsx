import Link from "next/link";
import { t } from "@/lib/i18n/t";

type MapName = "hoy" | "conexiones";

const MAPS: { name: MapName; href: string }[] = [
  { name: "hoy", href: "/" },
  { name: "conexiones", href: "/conexiones" },
];

/** Switch between the Hoy map and the Conexiones map. */
export function MapSwitch({ current }: { current: MapName }) {
  return (
    <nav aria-label={t("map.nav.label")}>
      <ul className="flex gap-1 rounded-pill border border-line bg-surface p-1">
        {MAPS.map((map) => (
          <li key={map.name}>
            <Link
              href={map.href}
              aria-current={map.name === current ? "page" : undefined}
              className="inline-flex min-h-9 items-center rounded-pill px-4 text-sm font-medium text-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-light aria-[current=page]:bg-light aria-[current=page]:text-night"
            >
              {t(`map.nav.${map.name}`)}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
