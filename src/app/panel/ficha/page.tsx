import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ContentPage } from "@/components/ui/content-page";
import { brand } from "@/config/brand";
import { LocationPicker } from "@/features/map/components/location-picker";
import { getNeighborhoods } from "@/features/map/data";
import { ProfileForm } from "@/features/organizations/components/profile-form";
import { getProfileForEdit } from "@/features/organizations/data";
import {
  PROFILE_CATEGORIES,
  PROFILE_VENUE_ACTIVITIES,
  type ProfileField,
  type ProfileFormTexts,
} from "@/features/organizations/types";
import { t } from "@/lib/i18n/t";
import { getCurrentUserId } from "@/lib/supabase/current-user";
import { getContentPageTexts } from "../../content-page-texts";

// Privata, a ogni richiesta: bloccante di proposito, così i redirect sono veri.
export const instant = false;

export const metadata: Metadata = { title: t("ficha.metaTitle"), robots: { index: false, follow: false } };

const linkClass = "underline underline-offset-2 focus-visible:outline-2 focus-visible:outline-light";

function getFormTexts(): ProfileFormTexts {
  const label = (field: ProfileField) => t(`ficha.labels.${field}`);
  return {
    sections: {
      identity: t("ficha.sections.identity"),
      about: t("ficha.sections.about"),
      place: t("ficha.sections.place"),
      contact: t("ficha.sections.contact"),
      story: t("ficha.sections.story"),
      google: t("ficha.sections.google"),
    },
    contactIntro: t("ficha.contactIntro"),
    labels: {
      name: label("name"),
      oneLiner: label("oneLiner"),
      whenToVisit: label("whenToVisit"),
      usualCategory: label("usualCategory"),
      venueActivity: label("venueActivity"),
      address: label("address"),
      neighborhoodSlug: label("neighborhoodSlug"),
      seekingOffering: label("seekingOffering"),
      whatForWhom: label("whatForWhom"),
      howSustained: label("howSustained"),
      whatTheyOffer: label("whatTheyOffer"),
      contactEmail: label("contactEmail"),
      contactPhone: label("contactPhone"),
      contactUrl: label("contactUrl"),
      story: label("story"),
      indexable: label("indexable"),
    },
    hints: {
      whenToVisit: t("ficha.hints.whenToVisit"),
      whatForWhom: t("ficha.hints.whatForWhom"),
      howSustained: t("ficha.hints.howSustained"),
      whatTheyOffer: t("ficha.hints.whatTheyOffer"),
      address: t("ficha.hints.address"),
      contactEmail: t("ficha.hints.contactEmail"),
      contactUrl: t("ficha.hints.contactUrl"),
      story: t("ficha.hints.story"),
      indexable: t("ficha.hints.indexable"),
    },
    required: t("ficha.required"),
    optional: t("ficha.optional"),
    choose: t("ficha.choose"),
    geocode: {
      button: t("ficha.geocode.button"),
      searching: t("ficha.geocode.searching"),
      found: t("ficha.geocode.found"),
      notFound: t("ficha.geocode.notFound"),
      failed: t("ficha.geocode.failed"),
    },
    submit: t("ficha.submit"),
    sending: t("ficha.sending"),
    checkFields: t("ficha.checkFields"),
    fieldErrors: {
      required: t("ficha.fieldErrors.required"),
      tooLong: t("ficha.fieldErrors.tooLong"),
      invalidEmail: t("ficha.fieldErrors.invalidEmail"),
      invalidUrl: t("ficha.fieldErrors.invalidUrl"),
      invalidOption: t("ficha.fieldErrors.invalidOption"),
      addressNotFound: t("ficha.fieldErrors.addressNotFound"),
      invalidLocation: t("ficha.fieldErrors.invalidLocation"),
    },
    formErrors: {
      tooMany: t("ficha.formErrors.tooMany"),
      tooManyRenames: t("ficha.formErrors.tooManyRenames"),
      notAllowed: t("ficha.formErrors.notAllowed"),
      generic: t("ficha.formErrors.generic"),
    },
  };
}

/** "Mi ficha" (docs/piani/sessione-7.md §3): la scheda pubblica della propria realtà, per tipo. */
export default async function ProfilePage() {
  const userId = await getCurrentUserId();
  if (!userId) redirect("/entrar");
  const profile = await getProfileForEdit(userId);
  if (!profile) redirect("/registro");

  const back = (
    <Link href="/panel" className={linkClass}>
      {t("eventForm.back")}
    </Link>
  );
  const contentPage = getContentPageTexts();

  if (!profile.active) {
    return (
      <ContentPage {...contentPage}>
        <h1 className="font-display text-2xl font-semibold">{t("ficha.title")}</h1>
        <p role="status">{t("ficha.suspended")}</p>
        {back}
      </ContentPage>
    );
  }

  const neighborhoods = profile.kind === "professional" ? await getNeighborhoods() : [];
  return (
    <ContentPage {...contentPage}>
      <h1 className="font-display text-2xl font-semibold">{t("ficha.title")}</h1>
      <p className="text-muted">{t("ficha.intro")}</p>
      <p className="text-sm text-muted">{t("ficha.renameNote")}</p>
      <Link href={`/a/${profile.slug}`} className={`self-start ${linkClass}`}>
        {t("ficha.viewProfile")}
      </Link>
      <ProfileForm
        kind={profile.kind}
        texts={getFormTexts()}
        values={profile.values}
        point={profile.point}
        categoryOptions={PROFILE_CATEGORIES.map((value) => ({ value, label: t(`hoy.categories.${value}`) }))}
        venueActivityOptions={PROFILE_VENUE_ACTIVITIES.map((value) => ({ value, label: t(`registro.venueActivities.${value}`) }))}
        neighborhoodOptions={neighborhoods.map((neighborhood) => ({ value: neighborhood.slug, label: neighborhood.name }))}
        locationPicker={
          <LocationPicker styleUrl={brand.mapStyleUrl} label={t("ficha.picker.label")} hint={t("ficha.picker.hint")} />
        }
      />
      {back}
    </ContentPage>
  );
}
