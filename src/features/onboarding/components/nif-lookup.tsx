"use client";

import { useState, useTransition, type MouseEvent } from "react";
import { Button } from "@/components/ui/button";
import { lookupAssociation } from "../actions";
import type { LookupResult, RegistrationFormTexts } from "../types";

type NifLookupProps = { entityType: string; texts: RegistrationFormTexts["lookup"] };

function readField(form: HTMLFormElement | null, name: string): HTMLInputElement | null {
  const element = form?.elements.namedItem(name);
  return element instanceof HTMLInputElement ? element : null;
}

/** "Comprobar" → "¿Sois <nombre>?" with the official name of the Comune list. Optional: without JS it is skipped. */
export function NifLookup({ entityType, texts }: NifLookupProps) {
  const [result, setResult] = useState<LookupResult | null>(null);
  const [pending, startTransition] = useTransition();

  function handleCheck(event: MouseEvent<HTMLButtonElement>) {
    const nif = readField(event.currentTarget.form, "nif")?.value ?? "";
    startTransition(async () => setResult(await lookupAssociation(entityType, nif)));
  }

  function handleUseName(event: MouseEvent<HTMLButtonElement>) {
    const nameField = readField(event.currentTarget.form, "name");
    if (nameField && result?.status === "found") {
      nameField.value = result.name;
      nameField.focus();
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <Button type="button" variant="secondary" onClick={handleCheck} disabled={pending}>
        {pending ? texts.checking : texts.button}
      </Button>
      <div role="status" className="text-sm">
        {result?.status === "found" && (
          <div className="flex flex-wrap items-center gap-2">
            <span>{texts.found.replace("{name}", result.name)}</span>
            <Button type="button" variant="secondary" onClick={handleUseName}>
              {texts.useName}
            </Button>
          </div>
        )}
        {result?.status === "notFound" && <p className="text-muted">{texts.notFound}</p>}
        {result && result.status !== "found" && result.status !== "notFound" && <p className="text-danger">{texts.failed}</p>}
      </div>
    </div>
  );
}
