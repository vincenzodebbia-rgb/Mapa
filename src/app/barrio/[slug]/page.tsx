import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ContentPage } from "@/components/ui/content-page";
import { JsonLd } from "@/components/ui/json-ld";
import { UpcomingEventList } from "@/features/events/components/upcoming-event-list";
import { getUpcomingEventsInNeighborhood } from "@/features/events/data";
import { NeighborhoodMap } from "@/features/map/components/neighborhood-map";
import { getNeighborhoodMapItems, getNeighborhoodPage } from "@/features/map/data";
import { OrganizationList } from "@/features/organizations/components/organization-list";
import { getOrganizationsInNeighborhood } from "@/features/organizations/data";
import { parseSlug } from "@/lib/domain/slug";
import { t } from "@/lib/i18n/t";
import { buildBreadcrumbList } from "@/lib/seo/json-ld";
import { getPageRobots } from "@/lib/seo/robots";
import { toAbsoluteUrl } from "@/lib/site-url";
import { getContentPageTexts } from "../../content-page-texts";
import { STATIC_PARAMS_PLACEHOLDER } from "../../static-params";

// The whole page is static (cached data), so an unknown barrio answers a real 404.
export const ensureStatic = "navigation";
// Blocking on purpose: params are read before rendering so the status can be decided. Once generated,
// the page is static and served from cache.
export const instant = false;

export function generateStaticParams() {
  return [{ slug: STATIC_PARAMS_PLACEHOLDER }];
}

async function loadNeighborhood(params: PageProps<"/barrio/[slug]">["params"]) {
  const slug = parseSlug((await params).slug);
  const neighborhood = slug ? await getNeighborhoodPage(slug) : null;
  if (!neighborhood) notFound();
  return neighborhood;
}

export async function generateMetadata({ params }: PageProps<"/barrio/[slug]">): Promise<Metadata> {
  const neighborhood = await loadNeighborhood(params);
  const path = `/barrio/${neighborhood.slug}`;
  const title = t("barrio.metaTitle", { name: neighborhood.name });
  const description = neighborhood.district
    ? t("barrio.metaDescription", { name: neighborhood.name, district: neighborhood.district })
    : t("barrio.metaDescriptionNoDistrict", { name: neighborhood.name });
  return {
    title,
    description,
    alternates: { canonical: path },
    // noindex until it has an association, a venue or a future event (docs/SPEC.md §14).
    robots: getPageRobots(neighborhood.hasContent),
    openGraph: { title, description, url: path, type: "website" },
  };
}

export default async function NeighborhoodRoute({ params }: PageProps<"/barrio/[slug]">) {
  const neighborhood = await loadNeighborhood(params);
  const [mapItems, events, organizations] = await Promise.all([
    getNeighborhoodMapItems(neighborhood.slug),
    getUpcomingEventsInNeighborhood(neighborhood.slug),
    getOrganizationsInNeighborhood(neighborhood.slug),
  ]);
  const breadcrumbs = [
    { name: t("breadcrumb.home"), url: toAbsoluteUrl("/") },
    { name: neighborhood.name, url: toAbsoluteUrl(`/barrio/${neighborhood.slug}`) },
  ];

  return (
    <ContentPage {...getContentPageTexts()}>
      <JsonLd data={buildBreadcrumbList(breadcrumbs)} />
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold">{t("barrio.heading", { name: neighborhood.name })}</h1>
        {neighborhood.district && <p className="text-sm text-muted">{t("barrio.district", { name: neighborhood.district })}</p>}
      </header>

      <NeighborhoodMap neighborhood={neighborhood} events={mapItems.events} places={mapItems.places} now={mapItems.now} />

      {!neighborhood.hasContent && (
        <p role="status" className="rounded-card border border-line bg-surface p-3 text-sm">
          {t("barrio.empty")}
        </p>
      )}

      <UpcomingEventList heading={t("barrio.upcoming")} emptyMessage={t("barrio.noUpcoming")} events={events} />
      <OrganizationList
        heading={t("barrio.organizations")}
        emptyMessage={t("barrio.noOrganizations")}
        organizations={organizations}
      />

      {neighborhood.neighbors.length > 0 && (
        <nav aria-label={t("barrio.neighbors")} className="flex flex-col gap-2">
          <h2 className="text-lg font-semibold">{t("barrio.neighbors")}</h2>
          <ul className="flex flex-wrap gap-2">
            {neighborhood.neighbors.map((neighbor) => (
              <li key={neighbor.slug}>
                <Link
                  href={`/barrio/${neighbor.slug}`}
                  className="inline-flex min-h-11 items-center rounded-pill border border-line bg-surface px-4 text-sm hover:bg-night focus-visible:outline-2 focus-visible:outline-light"
                >
                  {neighbor.name}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      )}
    </ContentPage>
  );
}
