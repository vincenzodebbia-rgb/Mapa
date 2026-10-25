// DTOs of the map block. They mirror the enums of the database without importing its generated types.

export type OrganizationKind = "association" | "venue" | "professional";
export type EventCategory = "musica" | "teatro_danza" | "arte" | "talleres" | "encuentros" | "comunidad" | "otros";
export type PriceType = "free" | "donation" | "paid";
export type LightState = "pulse" | "lit";

/** One occurrence of an event that has not ended yet, in the next 7 days. Times are ISO instants. */
export type MapEvent = {
  key: string; // event id + occurrence start: a weekly event can appear twice in the window
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

/** An active association or venue with an address: a point on the Conexiones map. */
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

/** A barrio page (/barrio/[slug]): noindex while it has no content (docs/SPEC.md §14). */
export type NeighborhoodPage = MapNeighborhood & {
  hasContent: boolean;
  neighbors: { slug: string; name: string }[];
};

/** What lights up on a barrio map. `now` is the time of the cached read (ISO), for the light states. */
export type NeighborhoodMapItems = {
  events: MapEvent[];
  places: MapPlace[];
  now: string;
};

/** What a popup shows, already formatted on the server. The client only turns it into DOM text. */
export type PopupContent = {
  title: string;
  lines: string[];
  link: { href: string; label: string } | null;
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
