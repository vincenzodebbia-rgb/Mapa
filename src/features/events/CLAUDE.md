This block owns `events`, `event_organizers` and the Storage bucket `event-images` (unused: no event images in v1, it can be dropped by a migration).
Contract: data.ts (server-only reads → DTOs in types.ts), actions.ts, schema.ts, components/. Nothing else is imported from outside.
Organizer names come from a join in data.ts; never import from src/features/organizations. The co-organizer search is a slot (`coorganizerPicker`) passed by the page.
Recurrence is expanded only by the SQL function `event_occurrences`. Never re-implement it in TypeScript.
Times are timestamptz; display in Europe/Madrid with src/lib/dates.ts.
Geocoding only via src/lib/domain/geocode.ts (Nominatim, cache, 1 req/s). No coordinates = cannot publish.
No event images in v1 (docs/SPEC.md §5): no image field in the form or on the event page. Open Graph uses a text-only generated image or none.
Before inserting, call check_rate_limit('event:' || owner_org, 20, interval '1 day').
Public reads (event page, upcoming lists, sitemap) use createSupabasePublicClient() inside `'use cache'` + cacheLife("minutes") + cacheTag(EVENTS_TAG): the event page is fully static, so 404 and the 7-day redirect (308, event-page-rules.ts) are real statuses. Any event write must call updateTag(EVENTS_TAG).
Next occurrence and end of the last one come from the SQL function event_schedule; lists from the view upcoming_events (60 days). EventDetails renders its own JSON-LD (event-json-ld.ts) and the Compartir button (Web Share API, WhatsApp link, copy).
