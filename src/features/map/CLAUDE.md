This block is a read model. It owns `neighborhoods` and reads the views `map_items` and `connection_lines` (both security_invoker). It never writes.
Pure functions with unit tests: light-state.ts (`getLightState(item, now)` → 'pulse' | 'lit' | 'faint'), to-geojson.ts, build-popup.ts.
build-popup.ts builds DOM nodes with textContent only; links accept only http/https. Never setHTML.
There is exactly ONE MapLibre component: components/map-view.tsx ('use client'), loaded with dynamic(..., { ssr: false }) from a small client wrapper. Data comes from the server page as GeoJSON props and updates the <Source>; never fetch inside the component.
Colors come from CSS variables at runtime (getComputedStyle: --color-light, --color-faint, --color-thread-1..4). No color literals.
The map style URL comes from brand.mapStyleUrl. Always show OpenStreetMap attribution. Every map view has a list view with the same items.
