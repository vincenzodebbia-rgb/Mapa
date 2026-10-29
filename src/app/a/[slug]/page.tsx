import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ContentPage } from "@/components/ui/content-page";
import { JsonLd } from "@/components/ui/json-ld";
import { UpcomingEventList } from "@/features/events/components/upcoming-event-list";
import { getUpcomingEventsForOrganization } from "@/features/events/data";
import { OrganizationProfile } from "@/features/organizations/components/organization-profile";
import { getOrganizationProfile } from "@/features/organizations/data";
import { parseSlug } from "@/lib/domain/slug";
import { t } from "@/lib/i18n/t";
import { buildBreadcrumbList } from "@/lib/seo/json-ld";
import { getPageRobots } from "@/lib/seo/robots";
import { toAbsoluteUrl } from "@/lib/site-url";
import { getContentPageTexts } from "../../content-page-texts";
import { STATIC_PARAMS_PLACEHOLDER } from "../../static-params";

// The whole page is static (cached data), so a missing profile answers a real 404, not a streamed one.
export const ensureStatic = "navigation";
// Blocking on purpose: params are read before rendering so the status can be decided. Once generated,
// the page is static and served from cache.
export const instant = false;

// Pages are generated on first visit; the build never reads the database (the placeholder is not a valid slug).
export function generateStaticParams() {
  return [{ slug: STATIC_PARAMS_PLACEHOLDER }];
}

async function loadOrganization(params: PageProps<"/a/[slug]">["params"]) {
  const slug = parseSlug((await params).slug);
  const organization = slug ? await getOrganizationProfile(slug) : null;
  if (!organization) notFound();
  return organization;
}

export async function generateMetadata({ params }: PageProps<"/a/[slug]">): Promise<Metadata> {
  const organization = await loadOrganization(params);
  const path = `/a/${organization.slug}`;
  const description = organization.oneLiner ?? t("organization.metaDescriptionFallback", { name: organization.name });
  return {
    title: organization.name,
    description,
    alternates: { canonical: path },
    // "Mostrar mi perfil en Google" turned off (professionals only): out of search engines (docs/SPEC.md §14).
    robots: getPageRobots(organization.indexable),
    openGraph: { title: organization.name, description, url: path, type: "profile" },
  };
}

export default async function OrganizationPage({ params }: PageProps<"/a/[slug]">) {
  const organization = await loadOrganization(params);
  const events = await getUpcomingEventsForOrganization(organization.id);
  const url = toAbsoluteUrl(`/a/${organization.slug}`);
  const breadcrumbs = [
    { name: t("breadcrumb.home"), url: toAbsoluteUrl("/") },
    ...(organization.neighborhood
      ? [{ name: organization.neighborhood.name, url: toAbsoluteUrl(`/barrio/${organization.neighborhood.slug}`) }]
      : []),
    { name: organization.name, url },
  ];

  return (
    <ContentPage {...getContentPageTexts()}>
      <JsonLd data={buildBreadcrumbList(breadcrumbs)} />
      <OrganizationProfile
        organization={organization}
        url={url}
        upcoming={
          <UpcomingEventList
            heading={t("organization.upcoming")}
            emptyMessage={t("organization.noUpcoming")}
            events={events}
          />
        }
      />
    </ContentPage>
  );
}
