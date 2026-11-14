import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import { HoyView } from "@/features/map/components/hoy-view";
import { getNeighborhoods, getUpcomingEvents } from "@/features/map/data";
import { parseMapFilters } from "@/features/map/schema";
import { t } from "@/lib/i18n/t";

export const metadata: Metadata = {
  title: t("hoy.metaTitle"),
  description: t("hoy.metaDescription"),
};

// I filtri sono nell'URL e gli eventi cambiano ogni minuto: il contenuto si genera a ogni richiesta, dentro Suspense,
// così il guscio statico (fallback) parte per primo (Cache Components).
export default function HoyPage({ searchParams }: PageProps<"/">) {
  return (
    <Suspense fallback={<p className="grid h-app place-items-center text-muted">{t("map.loading")}</p>}>
      <HoyContent searchParams={searchParams} />
    </Suspense>
  );
}

async function HoyContent({ searchParams }: Pick<PageProps<"/">, "searchParams">) {
  // "Adesso" decide cosa è acceso (pulse/lit) e cosa è già finito: deve essere l'ora della richiesta, mai quella di un
  // prerender. connection() rimanda tutto ciò che segue alla richiesta vera (Next.js 16, Cache Components): senza, il
  // rendering fatto dopo una Server Action (redirect di "Publicar" a /?evento=…) leggeva l'ora durante il prerender.
  await connection();
  const filters = parseMapFilters(await searchParams);
  const [events, neighborhoods] = await Promise.all([getUpcomingEvents(), getNeighborhoods()]);
  return <HoyView events={events} neighborhoods={neighborhoods} filters={filters} now={new Date()} />;
}
