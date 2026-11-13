import { setWorkerUrl } from "maplibre-gl";

// MapLibre 6 cerca il suo worker accanto al proprio file, un percorso che dopo il bundle non esiste più.
// new URL(..., import.meta.url) fa emettere al bundler il file del worker e ne dà l'URL vero, della stessa origine.
// Lo importa, per il suo effetto, ogni componente MapLibre di questo blocco.
setWorkerUrl(new URL("maplibre-gl/dist/maplibre-gl-worker.mjs", import.meta.url).href);
