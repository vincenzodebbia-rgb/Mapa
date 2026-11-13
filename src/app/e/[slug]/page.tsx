import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { ContentPage } from "@/components/ui/content-page";
import { JsonLd } from "@/components/ui/json-ld";
import { EventDetails } from "@/features/events/components/event-details";
import { getEventPage } from "@/features/events/data";
import { formatMadridDate, formatMadridTime } from "@/lib/dates";
import { parseSlug } from "@/lib/domain/slug";
import { t } from "@/lib/i18n/t";
import { buildBreadcrumbList } from "@/lib/seo/json-ld";
import { getPageRobots } from "@/lib/seo/robots";
import { getSiteUrl, toAbsoluteUrl } from "@/lib/site-url";
import { getContentPageTexts } from "../../content-page-texts";
import { STATIC_PARAMS_PLACEHOLDER } from "../../static-params";

// Tutta la pagina è statica (dati in cache), così il 404 e il redirect dopo 7 giorni sono stati HTTP veri.
export const ensureStatic = "navigation";
// Bloccante di proposito: i params si leggono prima del rendering, così si può decidere lo stato. Una volta generata,
// la pagina è statica e si serve dalla cache.
export const instant = false;

export function generateStaticParams() {
  return [{ slug: STATIC_PARAMS_PLACEHOLDER }];
}

const organizerList = new Intl.ListFormat("es-ES", { style: "long", type: "conjunction" });

async function loadEvent(params: PageProps<"/e/[slug]">["params"]) {
  const slug = parseSlug((await params).slug);
  const result = slug ? await getEventPage(slug) : ({ status: "missing" } as const);
  // 7 giorni dopo l'ultima occorrenza: redirect permanente (308) alla scheda di chi organizza (docs/SPEC.md §14).
  if (result.status === "redirect") permanentRedirect(`/a/${result.organizerSlug}`);
  if (result.status === "missing") notFound();
  return result;
}

export async function generateMetadata({ params }: PageProps<"/e/[slug]">): Promise<Metadata> {
  const { event, indexable } = await loadEvent(params);
  const path = `/e/${event.slug}`;
  const description = t("event.metaDescription", {
    date: formatMadridDate(event.startsAt),
    time: formatMadridTime(event.startsAt),
    place: event.venueName ?? event.address,
    organizers: organizerList.format(event.organizers.map((organizer) => organizer.name)),
  });
  return {
    title: event.title,
    description,
    alternates: { canonical: path },
    // Indicizzata fino alla fine; poi noindex fino al redirect (docs/SPEC.md §14).
    robots: getPageRobots(indexable),
    // Open Graph solo testo: nella v1 niente foto degli eventi (docs/SPEC.md §5).
    openGraph: { title: event.title, description, url: path, type: "website" },
  };
}

export default async function EventRoute({ params }: PageProps<"/e/[slug]">) {
  const { event, indexable } = await loadEvent(params);
  const url = toAbsoluteUrl(`/e/${event.slug}`);
  const breadcrumbs = [
    { name: t("breadcrumb.home"), url: toAbsoluteUrl("/") },
    ...(event.neighborhood
      ? [{ name: event.neighborhood.name, url: toAbsoluteUrl(`/barrio/${event.neighborhood.slug}`) }]
      : []),
    { name: event.title, url },
  ];

  return (
    <ContentPage {...getContentPageTexts()}>
      <JsonLd data={buildBreadcrumbList(breadcrumbs)} />
      <EventDetails event={event} url={url} siteUrl={getSiteUrl().toString()} upcoming={indexable} />
    </ContentPage>
  );
}
