"use client";

import { useRef, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { usePointField } from "@/components/ui/point-field";
import { locateAddress } from "../actions";
import type { RegistrationFormTexts } from "../types";

type AddressFieldProps = {
  id: string;
  defaultValue: string | undefined;
  required: boolean;
  describedBy: string | undefined;
  invalid: boolean;
  texts: RegistrationFormTexts["geocode"];
};

type Status = "idle" | "found" | "notFound" | "failed";

/**
 * Address + "Buscar en el mapa": puts the pin (shared PointField) on the address; the pin can then be dragged.
 * Without JavaScript the server geocodes the address on submit.
 */
export function AddressField({ id, defaultValue, required, describedBy, invalid, texts }: AddressFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const { setPoint } = usePointField();
  const [status, setStatus] = useState<Status>("idle");
  const [pending, startTransition] = useTransition();

  function handleSearch() {
    const address = inputRef.current?.value ?? "";
    startTransition(async () => {
      const outcome = await locateAddress(address);
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
        // A new address makes the old pin wrong: the server will geocode it again unless the person searches.
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
