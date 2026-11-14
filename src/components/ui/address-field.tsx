"use client";

import { useRef, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { usePointField } from "@/components/ui/point-field";

/** Risposta di una Server Action che cerca un indirizzo (ogni blocco ha la sua, con il suo limite di frequenza). */
export type LocateOutcome =
  | { ok: true; lng: number; lat: number }
  | { ok: false; error: "notFound" | "tooMany" | "invalid" | "generic" };

export type AddressFieldTexts = { button: string; searching: string; found: string; notFound: string; failed: string };

type AddressFieldProps = {
  id: string;
  defaultValue: string | undefined;
  required: boolean;
  describedBy: string | undefined;
  invalid: boolean;
  texts: AddressFieldTexts;
  /** La Server Action del blocco che usa il campo (iscrizione, eventi). */
  locate: (address: string) => Promise<LocateOutcome>;
};

type Status = "idle" | "found" | "notFound" | "failed";

/**
 * Indirizzo + "Buscar en el mapa": mette il pin (PointField condiviso) sull'indirizzo; poi il pin si può trascinare.
 * Senza JavaScript il server geocodifica l'indirizzo all'invio. Generico: non conosce né l'iscrizione né gli eventi.
 */
export function AddressField({ id, defaultValue, required, describedBy, invalid, texts, locate }: AddressFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const { setPoint } = usePointField();
  const [status, setStatus] = useState<Status>("idle");
  const [pending, startTransition] = useTransition();

  function handleSearch() {
    const address = inputRef.current?.value ?? "";
    startTransition(async () => {
      const outcome = await locate(address);
      if (outcome.ok) {
        setPoint({ lng: outcome.lng, lat: outcome.lat });
        setStatus("found");
      } else {
        setPoint(null);
        setStatus(outcome.error === "notFound" || outcome.error === "invalid" ? "notFound" : "failed");
      }
    });
  }

  return (
    <div className="flex flex-col gap-2">
      <Input
        ref={inputRef}
        id={id}
        name="address"
        autoComplete="street-address"
        maxLength={200}
        required={required}
        defaultValue={defaultValue}
        aria-describedby={describedBy}
        aria-invalid={invalid || undefined}
        // Un indirizzo nuovo rende sbagliato il pin vecchio: il server lo geocodificherà di nuovo, se la persona non cerca.
        onChange={() => {
          setPoint(null);
          setStatus("idle");
        }}
      />
      <Button type="button" variant="secondary" onClick={handleSearch} disabled={pending}>
        {pending ? texts.searching : texts.button}
      </Button>
      <p role="status" className="text-sm">
        {status === "found" && <span className="text-muted">{texts.found}</span>}
        {status === "notFound" && <span className="text-danger">{texts.notFound}</span>}
        {status === "failed" && <span className="text-danger">{texts.failed}</span>}
      </p>
    </div>
  );
}
