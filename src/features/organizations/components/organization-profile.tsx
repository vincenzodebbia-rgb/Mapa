import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { JsonLd } from "@/components/ui/json-ld";
import { t } from "@/lib/i18n/t";
import { buildOrganizationJsonLd } from "../organization-json-ld";
import type { OrganizationProfile as OrganizationProfileData } from "../types";

const linkClass = "underline underline-offset-2 break-words focus-visible:outline-2 focus-visible:outline-light";

type OrganizationProfileProps = {
  organization: OrganizationProfileData;
  /** Absolute URL of this page, for JSON-LD. */
  url: string;
  /** Upcoming events, composed by the page from the events block (a block never imports another). */
  upcoming: ReactNode;
};

/** The public profile /a/[slug] (docs/SPEC.md §7): minimal, no numbers or counters. Text is rendered as text. */
export function OrganizationProfile({ organization, url, upcoming }: OrganizationProfileProps) {
  const phoneHref = organization.contactPhone ? `tel:${organization.contactPhone.replace(/[^\d+]/g, "")}` : null;
  const hasContact = organization.contactEmail || organization.contactPhone || organization.contactUrl;

  return (
    <article className="flex flex-col gap-6">
      <JsonLd data={buildOrganizationJsonLd(organization, url)} />
      <header className="flex items-start gap-4">
        {organization.logoUrl && (
          // Already a small WebP re-encoded on upload: no optimization needed (and no image service).
          <Image
            src={organization.logoUrl}
            alt={t("organization.logoAlt", { name: organization.name })}
            width={64}
            height={64}
            unoptimized
            className="size-16 shrink-0 rounded-card object-contain"
          />
        )}
        <div className="flex flex-col gap-1">
          <p className="text-sm text-muted">{t(`organization.kinds.${organization.kind}`)}</p>
          <h1 className="text-2xl font-semibold">{organization.name}</h1>
          {organization.verified && <p className="text-sm text-muted">{t("organization.verified")}</p>}
        </div>
      </header>

      {organization.oneLiner && <p className="text-lg">{organization.oneLiner}</p>}

      <dl className="grid gap-4">
        {organization.whenToVisit && (
          <div className="flex flex-col gap-1">
            <dt className="text-sm text-muted">{t("organization.whenToVisit")}</dt>
            <dd>{organization.whenToVisit}</dd>
          </div>
        )}
        {hasContact && (
          <div className="flex flex-col gap-1">
            <dt className="text-sm text-muted">{t("organization.contact")}</dt>
            {organization.contactEmail && (
              <dd>
                <a href={`mailto:${organization.contactEmail}`} className={linkClass}>
                  {t("organization.email", { value: organization.contactEmail })}
                </a>
              </dd>
            )}
            {organization.contactPhone && phoneHref && (
              <dd>
                <a href={phoneHref} className={linkClass}>
                  {t("organization.phone", { value: organization.contactPhone })}
                </a>
              </dd>
            )}
            {organization.contactUrl && (
              <dd>
                <a href={organization.contactUrl} className={linkClass} rel="noopener noreferrer nofollow ugc">
                  {t("organization.web")}
                </a>
              </dd>
            )}
          </div>
        )}
        {organization.neighborhood && (
          <div className="flex flex-col gap-1">
            <dt className="text-sm text-muted">{t("organization.neighborhood")}</dt>
            <dd>
              <Link href={`/barrio/${organization.neighborhood.slug}`} className={linkClass}>
                {organization.neighborhood.name}
              </Link>
            </dd>
          </div>
        )}
        {organization.address && (
          <div className="flex flex-col gap-1">
            <dt className="text-sm text-muted">{t("organization.address")}</dt>
            <dd>{organization.address}</dd>
          </div>
        )}
      </dl>

      {organization.story && organization.kind !== "professional" && (
        <section className="flex flex-col gap-2">
          <h2 className="text-lg font-semibold">{t("organization.story")}</h2>
          <p className="whitespace-pre-line">{organization.story}</p>
        </section>
      )}

      {upcoming}
    </article>
  );
}
