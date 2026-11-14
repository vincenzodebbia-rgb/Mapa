import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getButtonClasses } from "@/components/ui/button";
import { ContentPage } from "@/components/ui/content-page";
import { brand } from "@/config/brand";
import { SignOutButton } from "@/features/auth/components/sign-out-button";
import { MyEventsList } from "@/features/events/components/my-events-list";
import { getArchiveCounts, getEventOwner, getMyEvents } from "@/features/events/data";
import { getOrganizationForUser } from "@/features/organizations/data";
import { formatMadridDate } from "@/lib/dates";
import { t } from "@/lib/i18n/t";
import { getCurrentUserId } from "@/lib/supabase/current-user";
import { getContentPageTexts } from "../content-page-texts";

// Home privata (SPEC §9): Nuevo evento, Mis eventos, Archivo, Mi ficha, Mi cuenta, Ayuda y contacto, Salir.
// Privata, a ogni richiesta: bloccante di proposito, così i redirect sono veri. Niente qui va in cache.
export const instant = false;

export const metadata: Metadata = { title: t("panel.metaTitle"), robots: { index: false, follow: false } };

const linkClass = "underline underline-offset-2 focus-visible:outline-2 focus-visible:outline-light";

export default async function PanelPage({ searchParams }: PageProps<"/panel">) {
  const userId = await getCurrentUserId();
  if (!userId) redirect("/entrar");
  const [organization, owner] = await Promise.all([getOrganizationForUser(userId), getEventOwner(userId)]);
  if (!organization || !owner) redirect("/registro");
  const now = new Date();
  const [events, archive] = await Promise.all([
    getMyEvents(owner.organizationId, now),
    getArchiveCounts(owner.organizationId, now),
  ]);
  const params = await searchParams;
  const outcome = params.evento;

  return (
    <ContentPage {...getContentPageTexts()}>
      <h1 className="font-display text-2xl font-semibold">{t("panel.title", { name: organization.name })}</h1>
      <p className="text-muted">{t("panel.intro")}</p>
      {outcome === "eliminado" && <p role="status">{t("panel.myEvents.deleted")}</p>}
      {outcome === "guardado" && <p role="status">{t("panel.myEvents.saved")}</p>}
      {params.ficha === "guardada" && <p role="status">{t("panel.profileSaved")}</p>}
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
          edit: t("panel.myEvents.edit"),
          delete: t("panel.myEvents.delete"),
          confirmDelete: t("panel.myEvents.confirmDelete"),
        }}
      />

      <section aria-labelledby="panel-archive" className="flex flex-col gap-1 border-t border-line pt-4">
        <h2 id="panel-archive" className="font-display text-lg font-semibold">
          {t("panel.archive.heading")}
        </h2>
        <p>{t("panel.archive.thisYear", { count: archive.thisYear })}</p>
        <p>{t("panel.archive.total", { count: archive.total })}</p>
        <p className="text-sm text-muted">{t("panel.archive.note")}</p>
      </section>

      <nav aria-label={t("panel.sections.manage")} className="flex flex-col gap-2 border-t border-line pt-4">
        <h2 className="font-display text-lg font-semibold">{t("panel.sections.manage")}</h2>
        <Link href="/panel/ficha" className={linkClass}>
          {t("panel.myProfile")}
        </Link>
        <Link href={`/a/${organization.slug}`} className={linkClass}>
          {t("panel.viewProfile")}
        </Link>
        <Link href="/panel/cuenta" className={linkClass}>
          {t("panel.myAccount")}
        </Link>
      </nav>

      <section aria-labelledby="panel-help" className="flex flex-col gap-2 border-t border-line pt-4">
        <h2 id="panel-help" className="font-display text-lg font-semibold">
          {t("panel.help.heading")}
        </h2>
        <p>{t("panel.help.body", { email: brand.contactEmail })}</p>
        <a href={`mailto:${brand.contactEmail}`} className={`self-start ${linkClass}`}>
          {brand.contactEmail}
        </a>
        <Link href="/legal" className={`self-start ${linkClass}`}>
          {t("panel.help.legal")}
        </Link>
      </section>

      <SignOutButton label={t("auth.signOut")} />
    </ContentPage>
  );
}
