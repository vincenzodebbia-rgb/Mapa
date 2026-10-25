import type { Metadata } from "next";
import type { ReactNode } from "react";
import { ContentPage } from "@/components/ui/content-page";
import { brand } from "@/config/brand";
import { t, type TranslationKey } from "@/lib/i18n/t";
import { getContentPageTexts } from "../content-page-texts";

export const metadata: Metadata = {
  title: t("legal.metaTitle"),
  description: t("legal.metaDescription"),
  alternates: { canonical: "/legal" },
  openGraph: { title: t("legal.metaTitle"), description: t("legal.metaDescription"), url: "/legal" },
};

// Licenses of the open data and map we use (docs/DATA_MODEL.md, docs/SPEC.md §12).
const CC_BY_4 = "https://creativecommons.org/licenses/by/4.0/deed.es";
const attributions: { key: TranslationKey; sources: string[] }[] = [
  { key: "legal.attributions.osm", sources: ["https://www.openstreetmap.org/copyright"] },
  { key: "legal.attributions.openFreeMap", sources: ["https://openfreemap.org/"] },
  { key: "legal.attributions.neighborhoods", sources: ["https://geoportal.madrid.es/", CC_BY_4] },
  { key: "legal.attributions.associations", sources: ["https://datos.madrid.es/", CC_BY_4] },
];

const linkClass = "underline underline-offset-2 focus-visible:outline-2 focus-visible:outline-light";

function Section({ heading, children }: { heading: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-lg font-semibold">{heading}</h2>
      {children}
    </section>
  );
}

// Placeholder legal texts until a lawyer reviews them (docs/BUILD_PLAN.md, before launch).
export default function LegalPage() {
  return (
    <ContentPage {...getContentPageTexts()}>
      <article className="flex flex-col gap-6">
        <header className="flex flex-col gap-2">
          <h1 className="text-2xl font-semibold">{t("legal.heading")}</h1>
          <p className="text-sm text-muted">{t("legal.placeholder")}</p>
        </header>
        <Section heading={t("legal.notice.heading")}>
          <p>{t("legal.notice.body")}</p>
        </Section>
        <Section heading={t("legal.privacy.heading")}>
          <p>{t("legal.privacy.body")}</p>
        </Section>
        <Section heading={t("legal.terms.heading")}>
          <p>{t("legal.terms.body")}</p>
        </Section>
        <Section heading={t("legal.illegal.heading")}>
          <p>{t("legal.illegal.body", { email: brand.illegalContentEmail })}</p>
          <p>
            <a href={`mailto:${brand.illegalContentEmail}`} className={linkClass}>
              {brand.illegalContentEmail}
            </a>
          </p>
        </Section>
        <Section heading={t("legal.contact.heading")}>
          <p>{t("legal.contact.body", { email: brand.contactEmail })}</p>
          <p>
            <a href={`mailto:${brand.contactEmail}`} className={linkClass}>
              {brand.contactEmail}
            </a>
          </p>
        </Section>
        <Section heading={t("legal.source.heading")}>
          <p>{t("legal.source.body")}</p>
          <p>
            <a href={brand.sourceCodeUrl} className={linkClass} rel="noopener noreferrer">
              {t("legal.source.link")}
            </a>
          </p>
        </Section>
        <Section heading={t("legal.attributions.heading")}>
          <ul className="flex flex-col gap-3">
            {attributions.map(({ key, sources }) => (
              <li key={key} className="flex flex-col gap-1">
                <span>{t(key)}</span>
                <span className="flex flex-wrap gap-3 text-sm">
                  {sources.map((href) => (
                    <a key={href} href={href} className={linkClass} rel="noopener noreferrer">
                      {href === CC_BY_4 ? t("legal.attributions.license") : t("legal.attributions.source")}
                    </a>
                  ))}
                </span>
              </li>
            ))}
          </ul>
        </Section>
      </article>
    </ContentPage>
  );
}
