import Link from "next/link";
import { getButtonClasses } from "@/components/ui/button";
import { formatMadridDate, formatMadridTime } from "@/lib/dates";
import type { MyEvent } from "../types";
import { DeleteEventButton } from "./delete-event-button";

export type MyEventsTexts = {
  upcomingHeading: string;
  pastHeading: string;
  empty: string;
  /** "Se repite hasta …" per l'ultimo giorno di una serie ("2027-05-20"); lo costruisce la pagina con t(). */
  repeatsUntil: (until: string) => string;
  edit: string;
  delete: string;
  confirmDelete: string;
};

const linkClass = "underline underline-offset-2 break-words focus-visible:outline-2 focus-visible:outline-light";

/** "Mis eventos" in /panel: in arrivo (con Editar ed Eliminar) e passati. Il titolo si mostra come testo. */
export function MyEventsList({ events, texts }: { events: MyEvent[]; texts: MyEventsTexts }) {
  const upcoming = events.filter((event) => event.upcoming);
  const past = events.filter((event) => !event.upcoming);

  const item = (event: MyEvent, withDelete: boolean) => (
    <li key={event.id} className="flex flex-col gap-2 border-t border-line pt-3">
      <Link href={`/e/${event.slug}`} className={linkClass}>
        {event.title}
      </Link>
      <p className="text-sm text-muted">
        {`${formatMadridDate(event.startsAt)}, ${formatMadridTime(event.startsAt)}`}
        {event.recurrence !== "none" && event.recurrenceUntil ? ` · ${texts.repeatsUntil(event.recurrenceUntil)}` : ""}
      </p>
      {withDelete && (
        <div className="flex flex-wrap gap-2">
          <Link href={`/panel/eventos/${event.id}`} className={getButtonClasses("secondary")}>
            {texts.edit}
          </Link>
          <DeleteEventButton eventId={event.id} label={texts.delete} confirmText={texts.confirmDelete} />
        </div>
      )}
    </li>
  );

  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-2">
        <h2 className="font-display text-lg font-semibold">{texts.upcomingHeading}</h2>
        {upcoming.length === 0 ? (
          <p className="text-muted">{texts.empty}</p>
        ) : (
          <ul aria-label={texts.upcomingHeading} className="flex flex-col gap-3">
            {upcoming.map((event) => item(event, true))}
          </ul>
        )}
      </section>
      {past.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="font-display text-lg font-semibold">{texts.pastHeading}</h2>
          <ul aria-label={texts.pastHeading} className="flex flex-col gap-3">
            {past.map((event) => item(event, false))}
          </ul>
        </section>
      )}
    </div>
  );
}
