import Link from "next/link";
import { t } from "@/lib/i18n/t";
import { describeEventDate, describeEventHours, describePlace, describePrice } from "../describe-event";
import type { UpcomingEvent } from "../types";

type UpcomingEventListProps = {
  heading: string;
  emptyMessage: string;
  events: UpcomingEvent[];
};

/** Next occurrences, sorted by time (organization profile, barrio page). */
export function UpcomingEventList({ heading, emptyMessage, events }: UpcomingEventListProps) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-lg font-semibold">{heading}</h2>
      {events.length === 0 ? (
        <p className="text-sm text-muted">{emptyMessage}</p>
      ) : (
        <ol aria-label={heading} className="flex flex-col gap-3">
          {events.map((event) => {
            const place = describePlace(event);
            return (
              <li key={event.key} className="flex flex-col gap-1 rounded-card border border-line bg-surface p-4">
                <p className="text-sm text-muted">
                  <time dateTime={event.startsAt}>
                    {t("event.dateTime", { date: describeEventDate(event), time: describeEventHours(event) })}
                  </time>
                </p>
                <h3 className="text-base font-semibold">
                  <Link
                    href={`/e/${event.slug}`}
                    className="underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-light"
                  >
                    {event.title}
                  </Link>
                </h3>
                {event.organizerNames && (
                  <p className="text-sm">{t("hoy.list.organizedBy", { names: event.organizerNames })}</p>
                )}
                {place && <p className="text-sm">{t("hoy.list.at", { place })}</p>}
                <p className="text-sm text-muted">
                  {[t(`hoy.categories.${event.category}`), describePrice(event)].join(t("hoy.list.separator"))}
                </p>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
