import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import { ConexionesView } from "@/features/map/components/conexiones-view";
import { getPlaces } from "@/features/map/data";
import { parseMapFilters } from "@/features/map/schema";
import { t } from "@/lib/i18n/t";
import { getCurrentUserId } from "@/lib/supabase/current-user";

export const metadata: Metadata = {
  title: t("conexiones.metaTitle"),
  description: t("conexiones.metaDescription"),
};

// Qui i fili non si mostrano finché il flag `threads` è spento (dopo il lancio, docs/SPEC.md §6).
export default function ConexionesPage({ searchParams }: PageProps<"/conexiones">) {
  return (
    <Suspense fallback={<p className="grid h-app place-items-center text-muted">{t("map.loading")}</p>}>
      <ConexionesContent searchParams={searchParams} />
    </Suspense>
  );
}

async function ConexionesContent({ searchParams }: Pick<PageProps<"/conexiones">, "searchParams">) {
  // Tutto a ogni richiesta, mai in un prerender: con un cookie di sessione il client Supabase della richiesta legge
  // l'ora (scadenza del token), e Next.js 16 lo vieta durante il prerender. Così la sessione non finisce in cache.
  await connection();
  const filters = parseMapFilters(await searchParams);
  const [places, userId] = await Promise.all([getPlaces(), getCurrentUserId()]);
  return <ConexionesView places={places} filters={filters} panelLabel={userId ? t("nav.panel") : null} />;
}
