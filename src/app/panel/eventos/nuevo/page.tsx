import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ContentPage } from "@/components/ui/content-page";
import { brand } from "@/config/brand";
import { EventForm } from "@/features/events/components/event-form";
import { getEventOwner } from "@/features/events/data";
import { getDefaultSchedule } from "@/features/events/schema";
import { EVENT_CATEGORY_VALUES } from "@/features/events/types";
import { LocationPicker } from "@/features/map/components/location-picker";
import { t } from "@/lib/i18n/t";
import { getCurrentUserId } from "@/lib/supabase/current-user";
import { getContentPageTexts } from "../../../content-page-texts";
import { getEventFormTexts } from "../event-form-texts";

// Privata, a ogni richiesta: bloccante di proposito, così i redirect sono veri.
export const instant = false;

export const metadata: Metadata = { title: t("eventForm.metaTitle"), robots: { index: false, follow: false } };

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
        texts={getEventFormTexts("create")}
        defaults={{
          values: {
            ...getDefaultSchedule(new Date()),
            category: owner.usualCategory ?? undefined,
            address: owner.address ?? undefined,
            priceType: "free",
            recurrence: "none",
          },
          point: owner.point,
        }}
        categoryOptions={EVENT_CATEGORY_VALUES.map((value) => ({ value, label: t(`hoy.categories.${value}`) }))}
        locationPicker={
          <LocationPicker styleUrl={brand.mapStyleUrl} label={t("eventForm.picker.label")} hint={t("eventForm.picker.hint")} />
        }
      />
      {back}
    </ContentPage>
  );
}
