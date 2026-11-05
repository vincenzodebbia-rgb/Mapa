"use client";

import { createContext, use, useState, type ReactNode } from "react";

// Un punto (lng/lat) condiviso dentro un modulo: chi lo cerca (l'indirizzo) e chi lo sposta (il pin sulla mappa)
// stanno in blocchi diversi, che non si importano a vicenda. Tutti e due usano questo contesto generico, e il modulo
// riceve il punto nei campi nascosti `lng` e `lat`.

export type Point = { lng: number; lat: number };

type PointFieldValue = { point: Point | null; setPoint: (point: Point | null) => void };

const PointFieldContext = createContext<PointFieldValue | null>(null);

export function PointFieldProvider({ children }: { children: ReactNode }) {
  const [point, setPoint] = useState<Point | null>(null);
  return (
    <PointFieldContext value={{ point, setPoint }}>
      {children}
      <input type="hidden" name="lng" value={point ? String(point.lng) : ""} />
      <input type="hidden" name="lat" value={point ? String(point.lat) : ""} />
    </PointFieldContext>
  );
}

export function usePointField(): PointFieldValue {
  const value = use(PointFieldContext);
  if (!value) throw new Error("usePointField must be used inside a PointFieldProvider");
  return value;
}
