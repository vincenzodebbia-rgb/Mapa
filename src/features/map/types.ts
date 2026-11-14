// DTO del blocco map. Riprendono gli enum del database senza importarne i tipi generati.

export type OrganizationKind = "association" | "venue" | "professional";
export type EventCategory = "musica" | "teatro_danza" | "arte" | "talleres" | "encuentros" | "comunidad" | "otros";
export type PriceType = "free" | "donation" | "paid";
export type LightState = "pulse" | "lit";

/** Un'occorrenza di un evento non ancora finito, nei prossimi 7 giorni. Gli orari sono istanti ISO. */
export type MapEvent = {
  key: string; // id dell'evento + inizio dell'occorrenza: un evento settimanale può comparire due volte nella finestra
  id: string;
  slug: string;
  title: string;
  category: EventCategory;
  priceType: PriceType;
  priceAmount: number | null;
  startsAt: string;
  endsAt: string;
  venueName: string | null;
  address: string | null;
  lng: number;
  lat: number;
  neighborhoodSlug: string | null;
  organizerNames: string;
  organizerKinds: OrganizationKind[];
};

/** Un'associazione o un espacio attivo con un indirizzo: un punto sulla mappa Conexiones. */
export type MapPlace = {
  id: string;
  slug: string;
  name: string;
  kind: Exclude<OrganizationKind, "professional">;
  address: string | null;
  lng: number;
  lat: number;
  neighborhoodSlug: string | null;
};

export type MapNeighborhood = {
  slug: string;
  name: string;
  district: string | null;
  center: [lng: number, lat: number];
  bounds: [west: number, south: number, east: number, north: number];
};

/** Una pagina di barrio (/barrio/[slug]): noindex finché non ha contenuti (docs/SPEC.md §14). */
export type NeighborhoodPage = MapNeighborhood & {
  hasContent: boolean;
  neighbors: { slug: string; name: string }[];
};

/** Cosa si accende sulla mappa di un barrio. `now` è l'ora della lettura in cache (ISO), per gli stati di luce. */
export type NeighborhoodMapItems = {
  events: MapEvent[];
  places: MapPlace[];
  now: string;
};

/** Cosa mostra un popup, già formattato sul server. Il client lo trasforma solo in testo del DOM. */
export type PopupContent = {
  title: string;
  lines: string[];
  link: { href: string; label: string } | null;
  /** "Editar" (/panel/eventos/<id>): solo sugli eventi della propria organizzazione, deciso sul server per richiesta. */
  editLink?: { href: string; label: string } | null;
};

export type MapPointProperties = {
  key: string;
  light: LightState;
};

export type MapFeatureCollection = {
  type: "FeatureCollection";
  features: {
    type: "Feature";
    id: number;
    geometry: { type: "Point"; coordinates: [number, number] };
    properties: MapPointProperties;
  }[];
};
