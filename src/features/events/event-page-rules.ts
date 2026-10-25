// Indexing rules of the event page (docs/SPEC.md §14): indexed until the end,
// then 7 days after the end of the LAST occurrence a permanent redirect to the organizer's profile.

export const EVENT_REDIRECT_AFTER_DAYS = 7;
const DAY_MS = 24 * 60 * 60 * 1000;

/** True once 7 days have passed since the end of the event's last occurrence. */
export function shouldRedirectEvent(lastEndsAt: string, now: Date): boolean {
  return now.getTime() >= new Date(lastEndsAt).getTime() + EVENT_REDIRECT_AFTER_DAYS * DAY_MS;
}

/** In the sitemap and indexable only while an occurrence has not ended. */
export function isEventIndexable(lastEndsAt: string, now: Date): boolean {
  return new Date(lastEndsAt).getTime() > now.getTime();
}
