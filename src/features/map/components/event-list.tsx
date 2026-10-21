import Link from "next/link";
import { t } from "@/lib/i18n/t";
import {
  describeEventPlace,
  describeEventPrice,
  describeEventTime,
  describeOrganizers,
} from "../describe-items";
import { getLightState } from "../light-state";
import type { MapEvent } from "../types";

/** List view of the Hoy map: the same events and filters, sorted by time. */
export function EventList({ events, now }: { events: MapEvent[]; now: Date }) {
  const heading = t("hoy.list.heading");

  return (
    <section className="mx-auto flex w-full max-w-2xl flex-col gap-3 p-4">
      <h2 className="flex items-baseline justify-between gap-3 text-lg font-semibold">
        {heading}
        <span className="text-sm font-normal text-muted">
          {events.length === 1 ? t("hoy.list.countOne") : t("hoy.list.count", { count: events.length })}
        </span>
      </h2>
      <ol aria-label={heading} className="flex flex-col gap-3">
        {events.map((event) => {
          const today = getLightState(event, now) === "pulse";
          const details = [describeOrganizers(event), describeEventPlace(event)].filter(Boolean);
          return (
            <li key={event.key} className="flex flex-col gap-1 rounded-card border border-line bg-surface p-4">
              <p className="flex items-center gap-2 text-sm text-muted">
                <span
                  aria-hidden="true"
                  className={`inline-flex size-2.5 shrink-0 rounded-pill bg-light ${today ? "animate-pulse" : ""}`}
                />
                {describeEventTime(event, now)}
              </p>
              <h3 className="text-base font-semibold">
                <Link
                  href={`/e/${event.slug}`}
                  className="underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-light"
                >
                  {event.title}
                </Link>
              </h3>
              {details.map((line) => (
                <p key={line} className="text-sm">
                  {line}
                </p>
              ))}
              <p className="text-sm text-muted">
                {[t(`hoy.categories.${event.category}`), describeEventPrice(event)].join(t("hoy.list.separator"))}
              </p>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
