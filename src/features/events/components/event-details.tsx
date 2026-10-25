import Link from "next/link";
import { JsonLd } from "@/components/ui/json-ld";
import { formatMadridTime } from "@/lib/dates";
import { t } from "@/lib/i18n/t";
import { describeEventDate, describeEventHours, describePlace, describePrice } from "../describe-event";
import { buildEventJsonLd } from "../event-json-ld";
import type { EventPage } from "../types";
import { ShareButton } from "./share-button";

const linkClass = "underline underline-offset-2 focus-visible:outline-2 focus-visible:outline-light";

type EventDetailsProps = {
  event: EventPage;
  /** Absolute URL of this page on the site's domain: JSON-LD, and the share link until the browser knows its own. */
  url: string;
  /** Site origin, for the organizers' absolute URLs in JSON-LD. */
  siteUrl: string;
  /** false once the last occurrence is over (the page lives 7 more days, then redirects). */
  upcoming: boolean;
};

/** The event page /e/[slug] (docs/SPEC.md §5). Text from the database is always rendered as text. */
export function EventDetails({ event, url, siteUrl, upcoming }: EventDetailsProps) {
  const date = describeEventDate(event);
  const hours = describeEventHours(event);
  const place = describePlace(event);
  const shareText = t("event.shareText", { title: event.title, date, time: hours, place });
  const directions = `https://www.openstreetmap.org/directions?to=${event.lat}%2C${event.lng}`;

  const jsonLd = buildEventJsonLd(event, {
    event: url,
    organizer: (slug) => new URL(`/a/${slug}`, siteUrl).toString(),
  });

  return (
    <article className="flex flex-col gap-5">
      <JsonLd data={jsonLd} />
      <header className="flex flex-col gap-2">
        <p className="text-sm text-muted">{t(`hoy.categories.${event.category}`)}</p>
        <h1 className="text-2xl font-semibold">{event.title}</h1>
        <p className="text-sm">
          {t("event.organizedBy")}{" "}
          {event.organizers.map((organizer, index) => (
            <span key={organizer.slug}>
              {index > 0 && (index === event.organizers.length - 1 ? t("event.and") : t("event.listSeparator"))}
              <Link href={`/a/${organizer.slug}`} className={linkClass}>
                {organizer.name}
              </Link>
            </span>
          ))}
        </p>
      </header>

      {!upcoming && (
        <p role="status" className="rounded-card border border-line bg-surface p-3 text-sm">
          {t("event.ended")}
        </p>
      )}

      <dl className="grid gap-4">
        <div className="flex flex-col gap-1">
          <dt className="text-sm text-muted">{t("event.when")}</dt>
          <dd>
            <time dateTime={event.startsAt}>
              {t("event.whenValue", { date, start: formatMadridTime(event.startsAt), end: formatMadridTime(event.endsAt) })}
            </time>
          </dd>
          {event.recurrence !== "none" && <dd className="text-sm text-muted">{t(`event.repeats.${event.recurrence}`)}</dd>}
        </div>
        <div className="flex flex-col gap-1">
          <dt className="text-sm text-muted">{t("event.price")}</dt>
          <dd>{describePrice(event)}</dd>
        </div>
        <div className="flex flex-col gap-1">
          <dt className="text-sm text-muted">{t("event.where")}</dt>
          <dd>{place}</dd>
          {event.neighborhood && (
            <dd className="text-sm">
              <Link href={`/barrio/${event.neighborhood.slug}`} className={linkClass}>
                {t("event.neighborhood", { name: event.neighborhood.name })}
              </Link>
            </dd>
          )}
          <dd className="text-sm">
            <a href={directions} className={linkClass} rel="noopener noreferrer">
              {t("event.directions")}
            </a>
          </dd>
        </div>
      </dl>

      {event.description && (
        <section className="flex flex-col gap-2">
          <h2 className="text-lg font-semibold">{t("event.about")}</h2>
          <p className="whitespace-pre-line">{event.description}</p>
        </section>
      )}

      <section className="flex flex-col gap-2">
        <h2 className="text-lg font-semibold">{t("event.share")}</h2>
        <ShareButton
          title={event.title}
          text={shareText}
          fallbackUrl={url}
          texts={{
            share: t("share.share"),
            whatsapp: t("share.whatsapp"),
            copy: t("share.copy"),
            copied: t("share.copied"),
            copyFailed: t("share.copyFailed"),
          }}
        />
      </section>
    </article>
  );
}
