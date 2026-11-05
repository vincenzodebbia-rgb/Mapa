"use client";

import Link from "next/link";
import { useActionState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PointFieldInputs, PointFieldProvider } from "@/components/ui/point-field";
import { Select } from "@/components/ui/select";
import { TurnstileWidget } from "@/components/ui/turnstile-widget";
import type { EntityType } from "@/lib/domain/nif";
import { registerOrganization } from "../actions";
import {
  INITIAL_REGISTRATION_STATE,
  LOOKUP_ENTITY_TYPES,
  type Option,
  type RegistrationField,
  type RegistrationFormTexts,
  type RegistrationTypeSlug,
} from "../types";
import { AddressField } from "./address-field";
import { FormField } from "./form-field";
import { NifLookup } from "./nif-lookup";

type RegistrationFormProps = {
  entityType: EntityType;
  typeSlug: RegistrationTypeSlug;
  texts: RegistrationFormTexts;
  turnstileSiteKey: string | undefined;
  venueActivityOptions: Option[];
  categoryOptions: Option[];
  neighborhoodOptions: Option[];
  /** Draggable pin from the map block, composed by the page (blocks never import each other). */
  locationPicker: ReactNode;
};

const textareaClass =
  "min-h-24 w-full rounded-card border border-line bg-surface p-3 text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-light";

/** Registration after "¿Qué sois?": fields depend on the entity type (docs/SPEC.md §8). Saved in one SQL call. */
export function RegistrationForm(props: RegistrationFormProps) {
  return (
    <PointFieldProvider>
      <RegistrationFormBody {...props} />
    </PointFieldProvider>
  );
}

function RegistrationFormBody({
  entityType,
  typeSlug,
  texts,
  turnstileSiteKey,
  venueActivityOptions,
  categoryOptions,
  neighborhoodOptions,
  locationPicker,
}: RegistrationFormProps) {
  const [state, formAction, pending] = useActionState(registerOrganization, INITIAL_REGISTRATION_STATE);
  const isInformal = entityType === "informal";
  const isCommercial = entityType === "commercial";
  const hasNif = !isInformal;
  const nifRequired = hasNif && !isCommercial;
  const canLookup = (LOOKUP_ENTITY_TYPES as readonly string[]).includes(entityType);
  const addressRequired = isCommercial;

  const marker = (required: boolean) => (required ? texts.required : texts.optional);
  const errorOf = (field: RegistrationField) => {
    const code = state.fieldErrors[field];
    return code ? texts.fieldErrors[code] : undefined;
  };
  const valueOf = (field: RegistrationField) => state.values[field];

  function textInput(field: RegistrationField, required: boolean, maxLength: number, extra: { type?: string; autoComplete?: string; inputMode?: "email" | "tel" | "url" } = {}) {
    const id = `registro-${field}`;
    return (
      <FormField id={id} label={texts.labels[field]} hint={texts.hints[field]} error={errorOf(field)} marker={marker(required)}>
        {(describedBy, invalid) => (
          <Input
            id={id}
            name={field}
            type={extra.type ?? "text"}
            autoComplete={extra.autoComplete ?? "off"}
            inputMode={extra.inputMode}
            maxLength={maxLength}
            required={required}
            defaultValue={valueOf(field)}
            aria-describedby={describedBy}
            aria-invalid={invalid || undefined}
          />
        )}
      </FormField>
    );
  }

  function textArea(field: RegistrationField, required: boolean) {
    const id = `registro-${field}`;
    return (
      <FormField id={id} label={texts.labels[field]} hint={texts.hints[field]} error={errorOf(field)} marker={marker(required)}>
        {(describedBy, invalid) => (
          <textarea
            id={id}
            name={field}
            maxLength={500}
            required={required}
            defaultValue={valueOf(field)}
            aria-describedby={describedBy}
            aria-invalid={invalid || undefined}
            className={textareaClass}
          />
        )}
      </FormField>
    );
  }

  function select(field: RegistrationField, required: boolean, options: Option[]) {
    const id = `registro-${field}`;
    return (
      <FormField id={id} label={texts.labels[field]} hint={texts.hints[field]} error={errorOf(field)} marker={marker(required)}>
        {(describedBy, invalid) => (
          <Select
            id={id}
            name={field}
            required={required}
            defaultValue={valueOf(field) ?? ""}
            aria-describedby={describedBy}
            aria-invalid={invalid || undefined}
          >
            <option value="">{texts.choose}</option>
            {options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        )}
      </FormField>
    );
  }

  const section = (title: string, children: ReactNode) => (
    <fieldset className="flex flex-col gap-4 border-t border-line pt-4">
      <legend className="font-display text-lg font-semibold">{title}</legend>
      {children}
    </fieldset>
  );

  return (
    // key: after every attempt the form is recreated with the values sent back (React resets it after an action),
    // and the Turnstile widget asks for a new token (each token works once).
    <form key={state.attempt} action={formAction} className="flex flex-col gap-6" noValidate>
      <input type="hidden" name="tipo" value={typeSlug} />
      <p>
        <Link href="/registro" className="text-sm text-muted underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-light">
          {texts.changeType}
        </Link>
      </p>

      {section(
        texts.sections.identity,
        <>
          {hasNif && (
            <div className="flex flex-col gap-2">
              {textInput("nif", nifRequired, 20, { autoComplete: "off" })}
              {canLookup && <NifLookup entityType={entityType} texts={texts.lookup} />}
            </div>
          )}
          {textInput("name", true, 120, { autoComplete: "organization" })}
          {isCommercial && select("venueActivity", true, venueActivityOptions)}
          {isInformal && textInput("oneLiner", true, 120)}
        </>,
      )}

      {section(
        texts.sections.about,
        isInformal ? (
          <>
            {select("neighborhoodSlug", false, neighborhoodOptions)}
            {textInput("seekingOffering", false, 200)}
            <label className="flex gap-3">
              <input type="checkbox" name="indexable" defaultChecked className="mt-1 accent-light" />
              <span>{texts.indexable}</span>
            </label>
          </>
        ) : (
          <>
            {textArea("whatForWhom", isCommercial)}
            {isCommercial ? textArea("whatTheyOffer", true) : textArea("howSustained", false)}
            {textInput("oneLiner", false, 120)}
            {textInput("whenToVisit", false, 120)}
            {select("usualCategory", false, categoryOptions)}
          </>
        ),
      )}

      {!isInformal &&
        section(
          texts.sections.place,
          <>
            <FormField
              id="registro-address"
              label={texts.labels.address}
              hint={texts.hints.address}
              error={errorOf("address")}
              marker={marker(addressRequired)}
            >
              {(describedBy, invalid) => (
                <AddressField
                  id="registro-address"
                  defaultValue={valueOf("address")}
                  required={addressRequired}
                  describedBy={describedBy}
                  invalid={invalid}
                  texts={texts.geocode}
                />
              )}
            </FormField>
            {locationPicker}
            <PointFieldInputs />
          </>,
        )}

      {section(
        texts.sections.contact,
        <>
          {textInput("contactUrl", false, 500, { type: "url", inputMode: "url", autoComplete: "url" })}
          {textInput("contactEmail", false, 254, { type: "email", inputMode: "email", autoComplete: "email" })}
          {textInput("contactPhone", false, 30, { type: "tel", inputMode: "tel", autoComplete: "tel" })}
        </>,
      )}

      {section(
        texts.sections.legal,
        <>
          <label className="flex gap-3">
            <input
              type="checkbox"
              name="accept"
              required
              defaultChecked={valueOf("accept") === "on"}
              aria-describedby={errorOf("accept") ? "registro-accept-error" : undefined}
              className="mt-1 accent-light"
            />
            <span>{texts.labels.accept}</span>
          </label>
          <Link href="/legal" className="text-sm text-muted underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-light">
            {texts.legalLink}
          </Link>
          {errorOf("accept") && (
            <p id="registro-accept-error" className="text-sm text-danger">
              {errorOf("accept")}
            </p>
          )}
        </>,
      )}

      <TurnstileWidget siteKey={turnstileSiteKey} resetSignal={state.attempt} />
      <noscript>
        <p className="text-sm text-muted">{texts.noScript}</p>
      </noscript>
      {state.formError && (
        <p role="alert" className="text-danger">
          {texts.formErrors[state.formError]}
        </p>
      )}
      {Object.keys(state.fieldErrors).length > 0 && !state.formError && (
        <p role="alert" className="text-danger">
          {texts.checkFields}
        </p>
      )}
      <Button type="submit" disabled={pending}>
        {pending ? texts.sending : texts.submit}
      </Button>
    </form>
  );
}
