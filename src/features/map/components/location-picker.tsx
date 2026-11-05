"use client";

import dynamic from "next/dynamic";
import { usePointField } from "@/components/ui/point-field";

// MapLibre needs the browser: loaded only on the client, and only once there is a point to show.
const LocationPickerMap = dynamic(() => import("./location-picker-map").then((module) => module.LocationPickerMap), {
  ssr: false,
});

type LocationPickerProps = { styleUrl: string; label: string; hint: string };

/**
 * Pin for the address of a place, passed by the page as a slot into a form wrapped in <PointFieldProvider>.
 * The address text stays the accessible way: the pin only refines the point and is never required.
 */
export function LocationPicker({ styleUrl, label, hint }: LocationPickerProps) {
  const { point, setPoint } = usePointField();
  if (!point) return null;
  return (
    <div className="flex flex-col gap-2">
      <LocationPickerMap styleUrl={styleUrl} point={point} onMove={setPoint} label={label} />
      <p className="text-sm text-muted">{hint}</p>
    </div>
  );
}
