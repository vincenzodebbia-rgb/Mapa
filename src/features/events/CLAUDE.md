This block owns `events`, `event_organizers` and the Storage bucket `event-images`.
Contract: data.ts (server-only reads → DTOs in types.ts), actions.ts, schema.ts, components/. Nothing else is imported from outside.
Organizer names come from a join in data.ts; never import from src/features/organizations. The co-organizer search is a slot (`coorganizerPicker`) passed by the page.
Recurrence is expanded only by the SQL function `event_occurrences`. Never re-implement it in TypeScript.
Times are timestamptz; display in Europe/Madrid with src/lib/dates.ts.
Geocoding only via src/lib/domain/geocode.ts (Nominatim, cache, 1 req/s). No coordinates = cannot publish.
Images: the action re-encodes with sharp to WebP ≤1600px, strips metadata, uploads to `{organization_id}/{event_id}.webp`. Delete files via the Storage API before deleting rows.
Before inserting, call check_rate_limit('event:' || owner_org, 20, interval '1 day').
