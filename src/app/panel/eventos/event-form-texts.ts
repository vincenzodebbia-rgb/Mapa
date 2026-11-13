import "server-only";
import type { EventFormTexts } from "@/features/events/types";
import { t } from "@/lib/i18n/t";

/** Testi del modulo evento, letti sul server: "create" per Nuevo evento, "edit" per Editar evento. */
export function getEventFormTexts(mode: "create" | "edit"): EventFormTexts {
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
    submit: mode === "edit" ? t("eventForm.editSubmit") : t("eventForm.submit"),
    sending: mode === "edit" ? t("eventForm.editSending") : t("eventForm.sending"),
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
      sameTime: t("eventForm.fieldErrors.sameTime"),
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
