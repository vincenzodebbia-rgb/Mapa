import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { getButtonClasses } from "@/components/ui/button";
import { JsonLd } from "@/components/ui/json-ld";
import { brand } from "@/config/brand";
import { getClaimContactHref } from "@/lib/claim-contact";
import { t } from "@/lib/i18n/t";
import { buildOrganizationJsonLd } from "../organization-json-ld";
import type { OrganizationProfile as OrganizationProfileData } from "../types";

const linkClass = "underline underline-offset-2 break-words focus-visible:outline-2 focus-visible:outline-light";

type OrganizationProfileProps = {
  organization: OrganizationProfileData;
  /** URL assoluto di questa pagina, per il JSON-LD. */
  url: string;
  /** Prossimi eventi, composti dalla pagina con il blocco events (un blocco non ne importa mai un altro). */
  upcoming: ReactNode;
};

/** La scheda pubblica /a/[slug] (docs/SPEC.md §7): minima, senza numeri né contatori. Il testo si mostra come testo. */
export function OrganizationProfile({ organization, url, upcoming }: OrganizationProfileProps) {
  const phoneHref = organization.contactPhone ? `tel:${organization.contactPhone.replace(/[^\d+]/g, "")}` : null;
  const hasContact = organization.contactEmail || organization.contactPhone || organization.contactUrl;

  return (
    <article className="flex flex-col gap-6">
      <JsonLd data={buildOrganizationJsonLd(organization, url)} />
      <header className="flex items-start gap-4">
        {organization.logoUrl && (
          // È già un piccolo WebP ricodificato al caricamento: non serve ottimizzarlo (e nessun servizio di immagini).
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

      {/* Nessun segno "verificada" (A1): chi vede la propria scheda creata da altri scrive al progetto. Ogni tipo. */}
      <aside className="flex flex-col items-start gap-2 border-t border-line pt-4">
        <a href={getClaimContactHref(organization.kind, organization.name)} className={getButtonClasses("secondary")}>
          {t(`claim.button.${organization.kind}`)}
        </a>
        <p className="text-sm text-muted">{t(`claim.profileHint.${organization.kind}`, { email: brand.contactEmail })}</p>
      </aside>
    </article>
  );
}
