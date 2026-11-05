import { setWorkerUrl } from "maplibre-gl";

// MapLibre 6 looks for its worker next to its own file, a path that no longer exists once bundled.
// new URL(..., import.meta.url) makes the bundler emit the worker file and gives its real, same-origin URL.
// Imported for its side effect by every MapLibre component of this block.
setWorkerUrl(new URL("maplibre-gl/dist/maplibre-gl-worker.mjs", import.meta.url).href);
