"use client";

import { useActionState, type ReactNode } from "react";
import { AddressField } from "@/components/ui/address-field";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { PointFieldInputs, PointFieldProvider } from "@/components/ui/point-field";
import { Select } from "@/components/ui/select";
import { createEvent, locateEventAddress } from "../actions";
import {
  INITIAL_EVENT_FORM_STATE,
  PRICE_TYPE_VALUES,
  RECURRENCE_VALUES,
  type EventField,
  type EventFormDefaults,
  type EventFormTexts,
  type Option,
} from "../types";

type EventFormProps = {
  texts: EventFormTexts;
  defaults: EventFormDefaults;
  categoryOptions: Option[];
  /** Pin trascinabile del blocco map, composto dalla pagina (i blocchi non si importano mai a vicenda). */
  locationPicker: ReactNode;
};

const textareaClass =
  "min-h-24 w-full rounded-card border border-line bg-surface p-3 text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-light";

/**
 * "Nuevo evento" in 4 blocchi (docs/SPEC.md §5): Qué, Cuándo, Dónde, Más (chiuso). Precompilato dal server (oggi, sede,
 * categoria abituale), così bastano titolo e ora. Niente immagini, niente co-organizzatori (D7). Si salva con createEvent.
 */
export function EventForm(props: EventFormProps) {
  return (
    <PointFieldProvider initialPoint={props.defaults.point}>
      <EventFormBody {...props} />
    </PointFieldProvider>
  );
}

function EventFormBody({ texts, defaults, categoryOptions, locationPicker }: EventFormProps) {
  const [state, formAction, pending] = useActionState(createEvent, INITIAL_EVENT_FORM_STATE);

  // Dopo un errore valgono i valori rimandati dal server; al primo giro quelli precompilati.
  const fallback: Partial<Record<EventField, string>> = {
    date: defaults.date,
    startTime: defaults.startTime,
    endTime: defaults.endTime,
    category: defaults.category ?? undefined,
    address: defaults.address ?? undefined,
    priceType: "free",
    recurrence: "none",
  };
  const valueOf = (field: EventField) => (state.attempt > 0 ? state.values[field] : fallback[field]);
  const marker = (required: boolean) => (required ? texts.required : texts.optional);
  const errorOf = (field: EventField) => {
    const code = state.fieldErrors[field];
    return code ? texts.fieldErrors[code] : undefined;
  };

  function field(name: EventField, required: boolean, render: (describedBy: string | undefined, invalid: boolean, id: string) => ReactNode) {
    const id = `evento-${name}`;
    return (
      <FormField id={id} label={texts.labels[name]} hint={texts.hints[name]} error={errorOf(name)} marker={marker(required)}>
        {(describedBy, invalid) => render(describedBy, invalid, id)}
      </FormField>
    );
  }

  function input(name: EventField, required: boolean, extra: { type?: string; maxLength?: number; inputMode?: "decimal" } = {}) {
    return field(name, required, (describedBy, invalid, id) => (
      <Input
        id={id}
        name={name}
        type={extra.type ?? "text"}
        inputMode={extra.inputMode}
        maxLength={extra.maxLength}
        autoComplete="off"
        required={required}
        defaultValue={valueOf(name)}
        aria-describedby={describedBy}
        aria-invalid={invalid || undefined}
      />
    ));
  }

  function select(name: EventField, required: boolean, options: Option[], withEmpty: boolean) {
    return field(name, required, (describedBy, invalid, id) => (
      <Select
        id={id}
        name={name}
        required={required}
        defaultValue={valueOf(name) ?? ""}
        aria-describedby={describedBy}
        aria-invalid={invalid || undefined}
      >
        {withEmpty && <option value="">{texts.choose}</option>}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </Select>
    ));
  }

  const section = (title: string, children: ReactNode) => (
    <fieldset className="flex flex-col gap-4 border-t border-line pt-4">
      <legend className="font-display text-lg font-semibold">{title}</legend>
      {children}
    </fieldset>
  );

  const priceOptions = PRICE_TYPE_VALUES.map((value) => ({ value, label: texts.priceTypes[value] }));
  const recurrenceOptions = RECURRENCE_VALUES.map((value) => ({ value, label: texts.recurrences[value] }));

  return (
    // key: dopo ogni tentativo il modulo si ricrea con i valori rimandati indietro (React lo azzera dopo un'action).
    <form key={state.attempt} action={formAction} className="flex flex-col gap-6" noValidate>
      {section(
        texts.sections.what,
        <>
          {input("title", true, { maxLength: 120 })}
          {select("category", true, categoryOptions, true)}
          {select("priceType", true, priceOptions, false)}
          {input("priceAmount", false, { inputMode: "decimal", maxLength: 9 })}
        </>,
      )}

      {section(
        texts.sections.when,
        <>
          {input("date", true, { type: "date" })}
          <div className="grid grid-cols-2 gap-4">
            {input("startTime", true, { type: "time" })}
            {input("endTime", true, { type: "time" })}
          </div>
          {select("recurrence", true, recurrenceOptions, false)}
          {input("recurrenceUntil", false, { type: "date" })}
        </>,
      )}

      {section(
        texts.sections.where,
        <>
          {field("address", true, (describedBy, invalid, id) => (
            <AddressField
              id={id}
              defaultValue={valueOf("address")}
              required
              describedBy={describedBy}
              invalid={invalid}
              texts={texts.geocode}
              locate={locateEventAddress}
            />
          ))}
          {locationPicker}
          <PointFieldInputs />
          {input("venueName", false, { maxLength: 120 })}
        </>,
      )}

      <details className="border-t border-line pt-4" open={Boolean(state.fieldErrors.description)}>
        <summary className="cursor-pointer font-display text-lg font-semibold focus-visible:outline-2 focus-visible:outline-light">
          {texts.sections.more}
        </summary>
        <div className="mt-4">
          {field("description", false, (describedBy, invalid, id) => (
            <textarea
              id={id}
              name="description"
              maxLength={500}
              defaultValue={valueOf("description")}
              aria-describedby={describedBy}
              aria-invalid={invalid || undefined}
              className={textareaClass}
            />
          ))}
        </div>
      </details>

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
