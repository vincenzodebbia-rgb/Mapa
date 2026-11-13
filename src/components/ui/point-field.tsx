"use client";

import { createContext, use, useState, type ReactNode } from "react";

// Un punto (lng/lat) condiviso dentro un modulo: chi lo cerca (l'indirizzo) e chi lo sposta (il pin sulla mappa)
// stanno in blocchi diversi, che non si importano a vicenda. Tutti e due usano questo contesto generico; il modulo
// riceve il punto dai campi nascosti `lng` e `lat` di <PointFieldInputs />.
// Il provider sta fuori dal <form>, così il punto resta anche quando il modulo si ricrea dopo un errore.

export type Point = { lng: number; lat: number };

type PointFieldValue = { point: Point | null; setPoint: (point: Point | null) => void };

const PointFieldContext = createContext<PointFieldValue | null>(null);

/** `initialPoint`: punto già noto (la sede dell'organizzazione nel modulo di un evento). */
export function PointFieldProvider({ children, initialPoint = null }: { children: ReactNode; initialPoint?: Point | null }) {
  const [point, setPoint] = useState<Point | null>(initialPoint);
  return <PointFieldContext value={{ point, setPoint }}>{children}</PointFieldContext>;
}

export function usePointField(): PointFieldValue {
  const value = use(PointFieldContext);
  if (!value) throw new Error("usePointField must be used inside a PointFieldProvider");
  return value;
}

/** Campi nascosti con il punto attuale, da mettere dentro il modulo. */
export function PointFieldInputs() {
  const { point } = usePointField();
  return (
    <>
      <input type="hidden" name="lng" value={point ? String(point.lng) : ""} />
      <input type="hidden" name="lat" value={point ? String(point.lat) : ""} />
    </>
  );
}
