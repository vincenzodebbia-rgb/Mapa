import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ContentPage } from "@/components/ui/content-page";
import { ReviewList } from "@/features/account/components/review-list";
import { getFlaggedOrganizations, isCurrentUserAdmin } from "@/features/account/data";
import { formatMadridDate } from "@/lib/dates";
import { t } from "@/lib/i18n/t";
import { getCurrentUserId } from "@/lib/supabase/current-user";
import { getContentPageTexts } from "../content-page-texts";

// Private, per request. Anyone who is not an admin gets a 404: the page does not reveal it exists.
export const instant = false;

export const metadata: Metadata = { title: t("revision.metaTitle"), robots: { index: false, follow: false } };

export default async function ReviewPage() {
  if (!(await getCurrentUserId()) || !(await isCurrentUserAdmin())) notFound();
  const items = await getFlaggedOrganizations();

  return (
    <ContentPage {...getContentPageTexts()}>
      <h1 className="font-display text-2xl font-semibold">{t("revision.title")}</h1>
      <p className="text-muted">{t("revision.intro")}</p>
      <ReviewList
        items={items}
        texts={{
          empty: t("revision.empty"),
          none: t("revision.none"),
          createdLabel: (date) => t("revision.created", { date: formatMadridDate(date) }),
          fields: {
            type: t("revision.fields.type"),
            activity: t("revision.fields.activity"),
            neighborhood: t("revision.fields.neighborhood"),
            web: t("revision.fields.web"),
            whatForWhom: t("revision.fields.whatForWhom"),
            howSustained: t("revision.fields.howSustained"),
            whatTheyOffer: t("revision.fields.whatTheyOffer"),
            reason: t("revision.fields.reason"),
            status: t("revision.fields.status"),
            profile: t("revision.fields.profile"),
          },
          entityTypes: {
            association: t("revision.entityTypes.association"),
            foundation: t("revision.entityTypes.foundation"),
            cooperative: t("revision.entityTypes.cooperative"),
            public_entity: t("revision.entityTypes.public_entity"),
            commercial: t("revision.entityTypes.commercial"),
            informal: t("revision.entityTypes.informal"),
          },
          reasons: {
            not_in_registry: t("revision.reasons.not_in_registry"),
            public_entity: t("revision.reasons.public_entity"),
            no_nif: t("revision.reasons.no_nif"),
            doubtful_activity: t("revision.reasons.doubtful_activity"),
          },
          activities: {
            libreria: t("registro.venueActivities.libreria"),
            sala_pequena: t("registro.venueActivities.sala_pequena"),
            centro_cultural: t("registro.venueActivities.centro_cultural"),
            galeria: t("registro.venueActivities.galeria"),
            taller_estudio: t("registro.venueActivities.taller_estudio"),
            cafe_cultural: t("registro.venueActivities.cafe_cultural"),
            discoteca_club: t("registro.venueActivities.discoteca_club"),
            bar_nocturno: t("registro.venueActivities.bar_nocturno"),
            otro: t("registro.venueActivities.otro"),
          },
          statuses: { active: t("revision.status.active"), suspended: t("revision.status.suspended") },
        }}
      />
    </ContentPage>
  );
}
