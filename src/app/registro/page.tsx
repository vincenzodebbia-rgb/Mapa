import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ContentPage } from "@/components/ui/content-page";
import { brand } from "@/config/brand";
import { getClaimContactHref } from "@/lib/claim-contact";
import { SignInForm } from "@/features/auth/components/sign-in-form";
import { LocationPicker } from "@/features/map/components/location-picker";
import { getNeighborhoods } from "@/features/map/data";
import { RegistrationForm } from "@/features/onboarding/components/registration-form";
import { TypePicker } from "@/features/onboarding/components/type-picker";
import { hasOrganization } from "@/features/onboarding/data";
import { parseRegistrationTypeSlug } from "@/features/onboarding/schema";
import {
  EVENT_CATEGORIES,
  REGISTRATION_TYPE_SLUGS,
  REGISTRATION_TYPES,
  VENUE_ACTIVITIES,
  type RegistrationFormTexts,
} from "@/features/onboarding/types";
import type { EntityType } from "@/lib/domain/nif";
import { getPublicEnv } from "@/lib/env";
import { t } from "@/lib/i18n/t";
import { getCurrentUserId } from "@/lib/supabase/current-user";
import { getContentPageTexts } from "../content-page-texts";
import { getSignInFormTexts } from "../sign-in-form-texts";

// Legge la sessione: bloccante di proposito, così i redirect sono veri (a /panel se l'utente ha già un'organizzazione).
export const instant = false;

export const metadata: Metadata = { title: t("registro.metaTitle"), robots: { index: false, follow: false } };

function getFormTexts(entityType: EntityType): RegistrationFormTexts {
  const isCommercial = entityType === "commercial";
  const isInformal = entityType === "informal";
  return {
    changeType: t("registro.changeType"),
    required: t("registro.required"),
    optional: t("registro.optional"),
    submit: t("registro.submit"),
    sending: t("registro.sending"),
    noScript: t("registro.noScript"),
    choose: t("registro.choose"),
    checkFields: t("registro.checkFields"),
    indexable: t("registro.indexable"),
    legalLink: t("registro.legalLink"),
    sections: {
      identity: t("registro.sections.identity"),
      about: t("registro.sections.about"),
      place: t("registro.sections.place"),
      contact: t("registro.sections.contact"),
      legal: t("registro.sections.legal"),
    },
    labels: {
      nif: t("registro.labels.nif"),
      name: t("registro.labels.name"),
      oneLiner: isInformal ? t("registro.labelsInformal.oneLiner") : t("registro.labels.oneLiner"),
      whatForWhom: isCommercial ? t("registro.labelsCommercial.whatForWhom") : t("registro.labels.whatForWhom"),
      howSustained: t("registro.labels.howSustained"),
      whatTheyOffer: t("registro.labels.whatTheyOffer"),
      venueActivity: t("registro.labels.venueActivity"),
      whenToVisit: t("registro.labels.whenToVisit"),
      usualCategory: t("registro.labels.usualCategory"),
      address: t("registro.labels.address"),
      neighborhoodSlug: t("registro.labels.neighborhoodSlug"),
      seekingOffering: t("registro.labels.seekingOffering"),
      contactEmail: t("registro.labels.contactEmail"),
      contactPhone: t("registro.labels.contactPhone"),
      contactUrl: t("registro.labels.contactUrl"),
      accept: t("registro.labels.accept"),
    },
    hints: {
      nif: isCommercial ? t("registro.hints.nifCommercial") : t("registro.hints.nif"),
      name: t("registro.hints.name"),
      address: t("registro.hints.address"),
      contactUrl: t("registro.hints.contactUrl"),
      contactEmail: t("registro.hints.contactEmail"),
      neighborhoodSlug: t("registro.hints.neighborhoodSlug"),
    },
    lookup: {
      button: t("registro.lookup.button"),
      checking: t("registro.lookup.checking"),
      // {name} si riempie nel browser con il nome ufficiale dell'elenco.
      found: t("registro.lookup.found", { name: "{name}" }),
      useName: t("registro.lookup.useName"),
      notFound: t("registro.lookup.notFound"),
      failed: t("registro.lookup.failed"),
    },
    geocode: {
      button: t("registro.geocode.button"),
      searching: t("registro.geocode.searching"),
      found: t("registro.geocode.found"),
      notFound: t("registro.geocode.notFound"),
      failed: t("registro.geocode.failed"),
    },
    fieldErrors: {
      required: t("registro.fieldErrors.required"),
      tooLong: t("registro.fieldErrors.tooLong"),
      invalidEmail: t("registro.fieldErrors.invalidEmail"),
      invalidUrl: t("registro.fieldErrors.invalidUrl"),
      invalidNif: t("registro.fieldErrors.invalidNif"),
      personalNif: t("registro.fieldErrors.personalNif"),
      invalidOption: t("registro.fieldErrors.invalidOption"),
      acceptRequired: t("registro.fieldErrors.acceptRequired"),
      addressNotFound: t("registro.fieldErrors.addressNotFound"),
      invalidLocation: t("registro.fieldErrors.invalidLocation"),
    },
    formErrors: {
      robot: t("registro.formErrors.robot"),
      tooMany: t("registro.formErrors.tooMany"),
      alreadyClaimed: t("registro.formErrors.alreadyClaimed", { email: brand.contactEmail }),
      invalidInvite: t("registro.formErrors.invalidInvite"),
      generic: t("registro.formErrors.generic"),
    },
    claim: { label: t("claim.button"), href: getClaimContactHref() },
  };
}

export default async function RegistrationPage({ searchParams }: PageProps<"/registro">) {
  const userId = await getCurrentUserId();
  const contentPage = getContentPageTexts();

  if (!userId) {
    return (
      <ContentPage {...contentPage}>
        <h1 className="font-display text-2xl font-semibold">{t("registro.title")}</h1>
        <p className="text-muted">{t("registro.introSignIn")}</p>
        <SignInForm texts={getSignInFormTexts()} turnstileSiteKey={getPublicEnv().NEXT_PUBLIC_TURNSTILE_SITE_KEY} />
      </ContentPage>
    );
  }
  if (await hasOrganization(userId)) redirect("/panel");

  const typeSlug = parseRegistrationTypeSlug((await searchParams).tipo);

  if (!typeSlug) {
    return (
      <ContentPage {...contentPage}>
        <h1 className="font-display text-2xl font-semibold">{t("registro.title")}</h1>
        <TypePicker
          texts={{ legend: t("registro.types.legend"), submit: t("registro.types.submit") }}
          options={REGISTRATION_TYPE_SLUGS.map((slug) => ({
            slug,
            label: t(`registro.types.${slug}.label`),
            description: t(`registro.types.${slug}.description`),
          }))}
        />
      </ContentPage>
    );
  }

  const entityType = REGISTRATION_TYPES[typeSlug];
  const neighborhoods = entityType === "informal" ? await getNeighborhoods() : [];
  return (
    <ContentPage {...contentPage}>
      <h1 className="font-display text-2xl font-semibold">
        {t("registro.formTitle", { type: t(`registro.types.${typeSlug}.label`) })}
      </h1>
      <RegistrationForm
        entityType={entityType}
        typeSlug={typeSlug}
        texts={getFormTexts(entityType)}
        turnstileSiteKey={getPublicEnv().NEXT_PUBLIC_TURNSTILE_SITE_KEY}
        venueActivityOptions={VENUE_ACTIVITIES.map((value) => ({ value, label: t(`registro.venueActivities.${value}`) }))}
        categoryOptions={EVENT_CATEGORIES.map((value) => ({ value, label: t(`hoy.categories.${value}`) }))}
        neighborhoodOptions={neighborhoods.map((neighborhood) => ({ value: neighborhood.slug, label: neighborhood.name }))}
        locationPicker={
          <LocationPicker styleUrl={brand.mapStyleUrl} label={t("registro.picker.label")} hint={t("registro.picker.hint")} />
        }
      />
    </ContentPage>
  );
}
