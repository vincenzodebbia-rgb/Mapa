import type { Metadata } from "next";
import { ContentPage } from "@/components/ui/content-page";
import { t } from "@/lib/i18n/t";
import { getContentPageTexts } from "../content-page-texts";

export const metadata: Metadata = {
  title: t("queEs.metaTitle"),
  description: t("queEs.metaDescription"),
  alternates: { canonical: "/que-es" },
  openGraph: { title: t("queEs.metaTitle"), description: t("queEs.metaDescription"), url: "/que-es" },
};

// Placeholder texts in messages/es.json: the founder writes the final ones.
export default function QueEsPage() {
  return (
    <ContentPage {...getContentPageTexts()}>
      <article className="flex flex-col gap-4">
        <h1 className="text-2xl font-semibold">{t("queEs.heading")}</h1>
        <p>{t("queEs.intro")}</p>
        <p>{t("queEs.body")}</p>
        <h2 className="text-lg font-semibold">{t("queEs.manifestoHeading")}</h2>
        <p className="text-muted">{t("queEs.manifesto")}</p>
      </article>
    </ContentPage>
  );
}
