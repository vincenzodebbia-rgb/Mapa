import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { z } from "zod";
import { ContentPage } from "@/components/ui/content-page";
import { brand } from "@/config/brand";
import { EventForm } from "@/features/events/components/event-form";
import { getEventForEdit, getEventOwner } from "@/features/events/data";
import { EVENT_CATEGORY_VALUES } from "@/features/events/types";
import { LocationPicker } from "@/features/map/components/location-picker";
import { t } from "@/lib/i18n/t";
import { getCurrentUserId } from "@/lib/supabase/current-user";
import { getContentPageTexts } from "../../../content-page-texts";
import { getEventFormTexts } from "../event-form-texts";

// Privata, a ogni richiesta: bloccante di proposito, così redirect e 404 sono veri.
export const instant = false;

export const metadata: Metadata = { title: t("eventForm.editMetaTitle"), robots: { index: false, follow: false } };

const eventIdSchema = z.uuid();

/**
 * "Editar evento" (decisione B del 13 novembre): stesso modulo di Nuevo evento con i valori salvati. Solo i membri
 * dell'organizzazione che ha creato l'evento; per chiunque altro (o un id che non esiste) 404. Si cambia tutta la serie.
 */
export default async function EditEventPage({ params }: PageProps<"/panel/eventos/[id]">) {
  const userId = await getCurrentUserId();
  if (!userId) redirect("/entrar");
  const owner = await getEventOwner(userId);
  if (!owner) redirect("/registro");
  const eventId = eventIdSchema.safeParse((await params).id);
  if (!eventId.success) notFound();
  const event = await getEventForEdit(eventId.data, owner.organizationId, new Date());
  if (!event) notFound();

  const contentPage = getContentPageTexts();
  const back = (
    <Link href="/panel" className="underline underline-offset-2 focus-visible:outline-2 focus-visible:outline-light">
      {t("eventForm.back")}
    </Link>
  );
  const message = !owner.active ? t("panel.suspended") : !event.upcoming ? t("eventForm.notEditable") : null;

  return (
    <ContentPage {...contentPage}>
      <h1 className="font-display text-2xl font-semibold">{t("eventForm.editTitle")}</h1>
      {message ? (
        <p role="status">{message}</p>
      ) : (
        <>
          <p className="text-muted">{t("eventForm.seriesNote")}</p>
          <EventForm
            eventId={event.id}
            texts={getEventFormTexts("edit")}
            defaults={event.defaults}
            categoryOptions={EVENT_CATEGORY_VALUES.map((value) => ({ value, label: t(`hoy.categories.${value}`) }))}
            locationPicker={
              <LocationPicker styleUrl={brand.mapStyleUrl} label={t("eventForm.picker.label")} hint={t("eventForm.picker.hint")} />
            }
          />
        </>
      )}
      {back}
    </ContentPage>
  );
}
