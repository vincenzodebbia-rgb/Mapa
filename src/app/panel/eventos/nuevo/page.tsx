import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ContentPage } from "@/components/ui/content-page";
import { brand } from "@/config/brand";
import { EventForm } from "@/features/events/components/event-form";
import { getEventOwner } from "@/features/events/data";
import { getDefaultSchedule } from "@/features/events/schema";
import { EVENT_CATEGORY_VALUES, type EventFormTexts } from "@/features/events/types";
import { LocationPicker } from "@/features/map/components/location-picker";
import { t } from "@/lib/i18n/t";
import { getCurrentUserId } from "@/lib/supabase/current-user";
import { getContentPageTexts } from "../../../content-page-texts";

// Privata, a ogni richiesta: bloccante di proposito, così i redirect sono veri.
export const instant = false;

export const metadata: Metadata = { title: t("eventForm.metaTitle"), robots: { index: false, follow: false } };

function getFormTexts(): EventFormTexts {
  return {
    sections: {
      what: t("eventForm.sections.what"),
      when: t("eventForm.sections.when"),
      where: t("eventForm.sections.where"),
      more: t("eventForm.sections.more"),
    },
    labels: {
      title: t("eventForm.labels.title"),
      category: t("eventForm.labels.category"),
      priceType: t("eventForm.labels.priceType"),
      priceAmount: t("eventForm.labels.priceAmount"),
      date: t("eventForm.labels.date"),
      startTime: t("eventForm.labels.startTime"),
      endTime: t("eventForm.labels.endTime"),
      recurrence: t("eventForm.labels.recurrence"),
      recurrenceUntil: t("eventForm.labels.recurrenceUntil"),
      address: t("eventForm.labels.address"),
      venueName: t("eventForm.labels.venueName"),
      description: t("eventForm.labels.description"),
    },
    hints: {
      priceAmount: t("eventForm.hints.priceAmount"),
      endTime: t("eventForm.hints.endTime"),
      recurrenceUntil: t("eventForm.hints.recurrenceUntil"),
      address: t("eventForm.hints.address"),
      venueName: t("eventForm.hints.venueName"),
    },
    required: t("eventForm.required"),
    optional: t("eventForm.optional"),
    choose: t("eventForm.choose"),
    priceTypes: {
      free: t("eventForm.priceTypes.free"),
      donation: t("eventForm.priceTypes.donation"),
      paid: t("eventForm.priceTypes.paid"),
    },
    recurrences: {
      none: t("eventForm.recurrences.none"),
      weekly: t("eventForm.recurrences.weekly"),
      monthly: t("eventForm.recurrences.monthly"),
    },
    geocode: {
      button: t("eventForm.geocode.button"),
      searching: t("eventForm.geocode.searching"),
      found: t("eventForm.geocode.found"),
      notFound: t("eventForm.geocode.notFound"),
      failed: t("eventForm.geocode.failed"),
    },
    submit: t("eventForm.submit"),
    sending: t("eventForm.sending"),
    checkFields: t("eventForm.checkFields"),
    fieldErrors: {
      required: t("eventForm.fieldErrors.required"),
      tooLong: t("eventForm.fieldErrors.tooLong"),
      invalidOption: t("eventForm.fieldErrors.invalidOption"),
      invalidPrice: t("eventForm.fieldErrors.invalidPrice"),
      invalidDate: t("eventForm.fieldErrors.invalidDate"),
      invalidTime: t("eventForm.fieldErrors.invalidTime"),
      nonexistentTime: t("eventForm.fieldErrors.nonexistentTime"),
      tooLongDuration: t("eventForm.fieldErrors.tooLongDuration"),
      inPast: t("eventForm.fieldErrors.inPast"),
      invalidRecurrenceUntil: t("eventForm.fieldErrors.invalidRecurrenceUntil"),
      addressNotFound: t("eventForm.fieldErrors.addressNotFound"),
      invalidLocation: t("eventForm.fieldErrors.invalidLocation"),
    },
    formErrors: {
      tooMany: t("eventForm.formErrors.tooMany"),
      notAllowed: t("eventForm.formErrors.notAllowed"),
      generic: t("eventForm.formErrors.generic"),
    },
  };
}

export default async function NewEventPage() {
  const userId = await getCurrentUserId();
  if (!userId) redirect("/entrar");
  const owner = await getEventOwner(userId);
  if (!owner) redirect("/registro");
  const contentPage = getContentPageTexts();
  const back = (
    <Link href="/panel" className="underline underline-offset-2 focus-visible:outline-2 focus-visible:outline-light">
      {t("eventForm.back")}
    </Link>
  );

  if (!owner.active) {
    return (
      <ContentPage {...contentPage}>
        <h1 className="font-display text-2xl font-semibold">{t("eventForm.title")}</h1>
        <p role="status">{t("panel.suspended")}</p>
        {back}
      </ContentPage>
    );
  }

  return (
    <ContentPage {...contentPage}>
      <h1 className="font-display text-2xl font-semibold">{t("eventForm.title")}</h1>
      <EventForm
        texts={getFormTexts()}
        defaults={{ ...getDefaultSchedule(new Date()), category: owner.usualCategory, address: owner.address, point: owner.point }}
        categoryOptions={EVENT_CATEGORY_VALUES.map((value) => ({ value, label: t(`hoy.categories.${value}`) }))}
        locationPicker={
          <LocationPicker styleUrl={brand.mapStyleUrl} label={t("eventForm.picker.label")} hint={t("eventForm.picker.hint")} />
        }
      />
      {back}
    </ContentPage>
  );
}
