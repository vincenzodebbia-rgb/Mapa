import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { ContentPage } from "@/components/ui/content-page";
import { JsonLd } from "@/components/ui/json-ld";
import { UpcomingEventList } from "@/features/events/components/upcoming-event-list";
import { getUpcomingEventsForOrganization } from "@/features/events/data";
import { OrganizationProfile } from "@/features/organizations/components/organization-profile";
import { getOrganizationProfile, getOrganizationSlugRedirect } from "@/features/organizations/data";
import { parseSlug } from "@/lib/domain/slug";
import { t } from "@/lib/i18n/t";
import { buildBreadcrumbList } from "@/lib/seo/json-ld";
import { getPageRobots } from "@/lib/seo/robots";
import { toAbsoluteUrl } from "@/lib/site-url";
import { getContentPageTexts } from "../../content-page-texts";
import { STATIC_PARAMS_PLACEHOLDER } from "../../static-params";

// Tutta la pagina è statica (dati in cache), così una scheda che non esiste risponde con un 404 vero, non in streaming.
export const ensureStatic = "navigation";
// Bloccante di proposito: i params si leggono prima del rendering, così si può decidere lo stato. Una volta generata,
// la pagina è statica e si serve dalla cache.
export const instant = false;

// Le pagine si generano alla prima visita; il build non legge mai il database (il segnaposto non è uno slug valido).
export function generateStaticParams() {
  return [{ slug: STATIC_PARAMS_PLACEHOLDER }];
}

async function loadOrganization(params: PageProps<"/a/[slug]">["params"]) {
  const slug = parseSlug((await params).slug);
  if (!slug) notFound();
  const organization = await getOrganizationProfile(slug);
  if (organization) return organization;
  // Vecchio indirizzo di una scheda che ha cambiato nome: redirect permanente (308) al nuovo, così i link già condivisi
  // continuano a funzionare (sessione 7). Deciso prima del rendering, come il 404: risposta vera, non in streaming.
  const currentSlug = await getOrganizationSlugRedirect(slug);
  if (currentSlug) permanentRedirect(`/a/${currentSlug}`);
  notFound();
}

export async function generateMetadata({ params }: PageProps<"/a/[slug]">): Promise<Metadata> {
  const organization = await loadOrganization(params);
  const path = `/a/${organization.slug}`;
  const description = organization.oneLiner ?? t("organization.metaDescriptionFallback", { name: organization.name });
  return {
    title: organization.name,
    description,
    alternates: { canonical: path },
    // "Mostrar mi perfil en Google" spento (solo professionisti): fuori dai motori di ricerca (docs/SPEC.md §14).
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
