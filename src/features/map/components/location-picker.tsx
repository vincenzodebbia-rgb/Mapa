"use client";

import dynamic from "next/dynamic";
import { usePointField } from "@/components/ui/point-field";

// MapLibre ha bisogno del browser: si carica solo sul client, e solo quando c'è un punto da mostrare.
const LocationPickerMap = dynamic(() => import("./location-picker-map").then((module) => module.LocationPickerMap), {
  ssr: false,
});

type LocationPickerProps = { styleUrl: string; label: string; hint: string };

/**
 * Pin per l'indirizzo di un luogo, passato dalla pagina come slot dentro un modulo avvolto in <PointFieldProvider>.
 * Il testo dell'indirizzo resta la strada accessibile: il pin rifinisce solo il punto e non è mai obbligatorio.
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
