import type { Metadata } from "next";
import { Suspense } from "react";
import { HoyView } from "@/features/map/components/hoy-view";
import { getNeighborhoods, getUpcomingEvents } from "@/features/map/data";
import { parseMapFilters } from "@/features/map/schema";
import { t } from "@/lib/i18n/t";

export const metadata: Metadata = {
  title: t("hoy.metaTitle"),
  description: t("hoy.metaDescription"),
};

// Filters are in the URL and events change every minute: the content renders per request, inside Suspense,
// so the static shell (fallback) ships first (Cache Components).
export default function HoyPage({ searchParams }: PageProps<"/">) {
  return (
    <Suspense fallback={<p className="grid h-app place-items-center text-muted">{t("map.loading")}</p>}>
      <HoyContent searchParams={searchParams} />
    </Suspense>
  );
}

async function HoyContent({ searchParams }: Pick<PageProps<"/">, "searchParams">) {
  const filters = parseMapFilters(await searchParams);
  const [events, neighborhoods] = await Promise.all([getUpcomingEvents(), getNeighborhoods()]);
  return <HoyView events={events} neighborhoods={neighborhoods} filters={filters} now={new Date()} />;
}
