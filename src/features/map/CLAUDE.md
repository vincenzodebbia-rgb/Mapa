This block is a read model. It owns `neighborhoods` and reads the views `map_items`, `map_neighborhoods`, `neighborhood_pages`, `neighborhood_neighbors` (and later `connection_lines`), all security_invoker. It never writes.
Official boundaries come from scripts/import-neighborhoods.ts, which GENERATES a migration (never writes to a database).
Barrio pages (/barrio/[slug]) read with createSupabasePublicClient() inside `'use cache'` (fully static page, real 404); NeighborhoodMap gets `now` from the cached read, never from the render.
Pages import only data.ts, schema.ts (URL filters), types.ts and components/ (HoyView, ConexionesView compose everything else).
Pure functions with unit tests: light-state.ts (`getLightState(item, now)` → 'pulse' | 'lit'; there is no 'faint' on the Hoy map), filter-events.ts, to-geojson.ts, build-popup.ts. describe-items.ts (server-only) turns DTOs into the texts of popups and lists.
The Hoy map (`/`) shows only events. Organizations appear as points only on the static `/conexiones` map (active associations and venues with an address); thread lines are added there only when the `threads` flag is on.
Filters live in the URL (precio, cat, quien, barrio, solo=hoy, vista=lista). The barrio centers the map and filters the list; the map points are not filtered by barrio.
build-popup.ts builds DOM nodes with textContent only; links accept only http/https or same-site paths. Never setHTML.
There are exactly TWO MapLibre components, both 'use client' and loaded with dynamic(..., { ssr: false }):
- components/map-view.tsx (from map-view-loader.tsx): the read maps. Data comes from the server page as GeoJSON + popup texts by key; never fetch inside the component.
- components/location-picker-map.tsx (from location-picker.tsx): one draggable pin for the address of a place (registration, later "Mi ficha"). It reads and writes the point through `usePointField()` of src/components/ui/point-field.tsx; the page passes `<LocationPicker />` as a slot into the form of another block. It never fetches and never writes to the database. The map is bounded to the Comunidad de Madrid (same box as private.make_org_point).
MapLibre 6 finds its worker through setWorkerUrl(new URL("maplibre-gl/dist/maplibre-gl-worker.mjs", import.meta.url)) in components/maplibre-worker.ts: every MapLibre component imports it; without it the worker 404s once bundled.
Colors come from the tokens at runtime (an element with `text-light`, read by components/read-css-color.ts as rgba, because MapLibre may not parse oklch). No color literals.
The map style URL comes from brand.mapStyleUrl. Always show OpenStreetMap attribution. Every map view has a list view with the same items and the same filters.
