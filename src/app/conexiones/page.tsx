import type { Metadata } from "next";
import { Suspense } from "react";
import { ConexionesView } from "@/features/map/components/conexiones-view";
import { getPlaces } from "@/features/map/data";
import { parseMapFilters } from "@/features/map/schema";
import { t } from "@/lib/i18n/t";

export const metadata: Metadata = {
  title: t("conexiones.metaTitle"),
  description: t("conexiones.metaDescription"),
};

// Threads are not shown here until the `threads` flag is on (after launch, docs/SPEC.md §6).
export default function ConexionesPage({ searchParams }: PageProps<"/conexiones">) {
  return (
    <Suspense fallback={<p className="grid h-app place-items-center text-muted">{t("map.loading")}</p>}>
      <ConexionesContent searchParams={searchParams} />
    </Suspense>
  );
}

async function ConexionesContent({ searchParams }: Pick<PageProps<"/conexiones">, "searchParams">) {
  const filters = parseMapFilters(await searchParams);
  const places = await getPlaces();
  return <ConexionesView places={places} filters={filters} />;
}
