import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getButtonClasses } from "@/components/ui/button";
import { ContentPage } from "@/components/ui/content-page";
import { SignOutButton } from "@/features/auth/components/sign-out-button";
import { MyEventsList } from "@/features/events/components/my-events-list";
import { getEventOwner, getMyEvents } from "@/features/events/data";
import { getOrganizationForUser } from "@/features/organizations/data";
import { formatMadridDate } from "@/lib/dates";
import { t } from "@/lib/i18n/t";
import { getCurrentUserId } from "@/lib/supabase/current-user";
import { getContentPageTexts } from "../content-page-texts";

// Panel provvisorio: nome, "Nuevo evento", Mis eventos, scheda pubblica e "Salir". Il resto arriva con la sessione 7.
// Privata, a ogni richiesta: bloccante di proposito, così i redirect sono veri.
export const instant = false;

export const metadata: Metadata = { title: t("panel.metaTitle"), robots: { index: false, follow: false } };

export default async function PanelPage({ searchParams }: PageProps<"/panel">) {
  const userId = await getCurrentUserId();
  if (!userId) redirect("/entrar");
  const [organization, owner] = await Promise.all([getOrganizationForUser(userId), getEventOwner(userId)]);
  if (!organization || !owner) redirect("/registro");
  const events = await getMyEvents(owner.organizationId, new Date());
  const outcome = (await searchParams).evento;

  return (
    <ContentPage {...getContentPageTexts()}>
      <h1 className="font-display text-2xl font-semibold">{t("panel.title", { name: organization.name })}</h1>
      <p className="text-muted">{t("panel.intro")}</p>
      {outcome === "eliminado" && <p role="status">{t("panel.myEvents.deleted")}</p>}
      {outcome === "error" && (
        <p role="alert" className="text-danger">
          {t("panel.myEvents.deleteFailed")}
        </p>
      )}
      {owner.active ? (
        <Link href="/panel/eventos/nuevo" className={`${getButtonClasses("primary")} self-start`}>
          {t("panel.newEvent")}
        </Link>
      ) : (
        <p role="status">{t("panel.suspended")}</p>
      )}
      <MyEventsList
        events={events}
        texts={{
          upcomingHeading: t("panel.myEvents.upcoming"),
          pastHeading: t("panel.myEvents.past"),
          empty: t("panel.myEvents.empty"),
          repeatsUntil: (until) => t("panel.myEvents.repeatsUntil", { date: formatMadridDate(`${until}T12:00:00Z`) }),
          delete: t("panel.myEvents.delete"),
          confirmDelete: t("panel.myEvents.confirmDelete"),
        }}
      />
      <Link
        href={`/a/${organization.slug}`}
        className="underline underline-offset-2 focus-visible:outline-2 focus-visible:outline-light"
      >
        {t("panel.viewProfile")}
      </Link>
      <SignOutButton label={t("auth.signOut")} />
    </ContentPage>
  );
}
