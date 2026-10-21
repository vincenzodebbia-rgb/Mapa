"use client";

import dynamic from "next/dynamic";
import type { MapViewProps } from "./map-view";

// MapLibre needs the browser: load it only on the client. dynamic(..., { ssr: false }) is not allowed in
// Server Components, hence this small client wrapper.
const MapView = dynamic(() => import("./map-view").then((module) => module.MapView), { ssr: false });

type MapViewLoaderProps = MapViewProps & { loadingLabel: string };

export function MapViewLoader({ loadingLabel, ...props }: MapViewLoaderProps) {
  return (
    <div className="relative h-full w-full">
      <p className="absolute inset-0 grid place-items-center text-muted">{loadingLabel}</p>
      <div className="absolute inset-0">
        <MapView {...props} />
      </div>
    </div>
  );
}
