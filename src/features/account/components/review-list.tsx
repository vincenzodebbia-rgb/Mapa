import Link from "next/link";
import type { ReviewItem, ReviewListTexts } from "../types";

const linkClass = "underline underline-offset-2 focus-visible:outline-2 focus-visible:outline-light";

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-sm text-muted">{label}</dt>
      <dd className="break-words whitespace-pre-line">{value}</dd>
    </div>
  );
}

/** Elenco in sola lettura per il fondatore. Il testo del database si mostra solo come testo. */
export function ReviewList({ items, texts }: { items: ReviewItem[]; texts: ReviewListTexts }) {
  if (items.length === 0) return <p className="text-muted">{texts.empty}</p>;
  const orNone = (value: string | null) => value ?? texts.none;

  return (
    <ul className="flex flex-col gap-4">
      {items.map((item) => (
        <li key={item.id} className="rounded-card border border-line bg-surface p-4">
          <article className="flex flex-col gap-3">
            <header className="flex flex-col gap-1">
              <h2 className="font-display text-lg font-semibold">{item.name}</h2>
              <p className="text-sm text-muted">{texts.createdLabel(item.createdAt)}</p>
            </header>
            <dl className="flex flex-col gap-2">
              <Row label={texts.fields.reason} value={item.flagReason ? texts.reasons[item.flagReason] : texts.none} />
              <Row label={texts.fields.type} value={item.entityType ? texts.entityTypes[item.entityType] : texts.none} />
              {item.venueActivity && <Row label={texts.fields.activity} value={texts.activities[item.venueActivity]} />}
              <Row label={texts.fields.neighborhood} value={orNone(item.neighborhoodName)} />
              <Row
                label={texts.fields.web}
                value={
                  item.contactUrl ? (
                    <a href={item.contactUrl} rel="noopener noreferrer nofollow ugc" target="_blank" className={linkClass}>
                      {item.contactUrl}
                    </a>
                  ) : (
                    texts.none
                  )
                }
              />
              <Row label={texts.fields.whatForWhom} value={orNone(item.whatForWhom)} />
              {item.howSustained && <Row label={texts.fields.howSustained} value={item.howSustained} />}
              {item.whatTheyOffer && <Row label={texts.fields.whatTheyOffer} value={item.whatTheyOffer} />}
              <Row label={texts.fields.status} value={texts.statuses[item.status]} />
            </dl>
            <Link href={`/a/${item.slug}`} className={`text-sm ${linkClass}`}>
              {texts.fields.profile}
            </Link>
          </article>
        </li>
      ))}
    </ul>
  );
}
