"use client";

import { useActionState, type ReactNode } from "react";
import { AddressField } from "@/components/ui/address-field";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { PointFieldInputs, PointFieldProvider } from "@/components/ui/point-field";
import { Select } from "@/components/ui/select";
import { locateProfileAddress, updateProfile } from "../actions";
import {
  INITIAL_PROFILE_FORM_STATE,
  type OrganizationKind,
  type ProfileField,
  type ProfileFormTexts,
  type ProfileOption,
} from "../types";

type ProfileFormProps = {
  kind: OrganizationKind;
  texts: ProfileFormTexts;
  /** Valori salvati, già nel formato dei campi. */
  values: Partial<Record<ProfileField, string>>;
  point: { lng: number; lat: number } | null;
  categoryOptions: ProfileOption[];
  venueActivityOptions: ProfileOption[];
  neighborhoodOptions: ProfileOption[];
  /** Pin trascinabile del blocco map, composto dalla pagina (i blocchi non si importano mai a vicenda). */
  locationPicker: ReactNode;
};

const textareaClass =
  "min-h-24 w-full rounded-card border border-line bg-surface p-3 text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-light";

/**
 * "Mi ficha": la scheda pubblica, per tipo (gli stessi campi dell'iscrizione). I contatti pubblici stanno in un blocco
 * ben visibile. NIF e tipo di entità non ci sono: non si modificano. Si salva con updateProfile.
 */
export function ProfileForm(props: ProfileFormProps) {
  return (
    <PointFieldProvider initialPoint={props.point}>
      <ProfileFormBody {...props} />
    </PointFieldProvider>
  );
}

function ProfileFormBody({
  kind,
  texts,
  values,
  categoryOptions,
  venueActivityOptions,
  neighborhoodOptions,
  locationPicker,
}: ProfileFormProps) {
  const [state, formAction, pending] = useActionState(updateProfile, INITIAL_PROFILE_FORM_STATE);
  const isProfessional = kind === "professional";
  const isVenue = kind === "venue";

  // Dopo un errore valgono i valori rimandati dal server; al primo giro quelli salvati.
  const valueOf = (field: ProfileField) => (state.attempt > 0 ? state.values[field] : values[field]);
  const marker = (required: boolean) => (required ? texts.required : texts.optional);
  const errorOf = (field: ProfileField) => {
    const code = state.fieldErrors[field];
    return code ? texts.fieldErrors[code] : undefined;
  };

  function field(name: ProfileField, required: boolean, render: (describedBy: string | undefined, invalid: boolean, id: string) => ReactNode) {
    const id = `ficha-${name}`;
    return (
      <FormField id={id} label={texts.labels[name]} hint={texts.hints[name]} error={errorOf(name)} marker={marker(required)}>
        {(describedBy, invalid) => render(describedBy, invalid, id)}
      </FormField>
    );
  }

  function input(name: ProfileField, required: boolean, maxLength: number, extra: { type?: string; autoComplete?: string; inputMode?: "email" | "tel" | "url" } = {}) {
    return field(name, required, (describedBy, invalid, id) => (
      <Input
        id={id}
        name={name}
        type={extra.type ?? "text"}
        inputMode={extra.inputMode}
        autoComplete={extra.autoComplete ?? "off"}
        maxLength={maxLength}
        required={required}
        defaultValue={valueOf(name)}
        aria-describedby={describedBy}
        aria-invalid={invalid || undefined}
      />
    ));
  }

  function textArea(name: ProfileField, required: boolean, maxLength: number) {
    return field(name, required, (describedBy, invalid, id) => (
      <textarea
        id={id}
        name={name}
        maxLength={maxLength}
        required={required}
        defaultValue={valueOf(name)}
        aria-describedby={describedBy}
        aria-invalid={invalid || undefined}
        className={textareaClass}
      />
    ));
  }

  function select(name: ProfileField, required: boolean, options: ProfileOption[]) {
    return field(name, required, (describedBy, invalid, id) => (
      <Select
        id={id}
        name={name}
        required={required}
        defaultValue={valueOf(name) ?? ""}
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
    ));
  }

  const section = (title: string, children: ReactNode) => (
    <fieldset className="flex flex-col gap-4 border-t border-line pt-4">
      <legend className="font-display text-lg font-semibold">{title}</legend>
      {children}
    </fieldset>
  );

  return (
    // key: dopo ogni tentativo il modulo si ricrea con i valori rimandati indietro (React lo azzera dopo un'action).
    <form key={state.attempt} action={formAction} className="flex flex-col gap-6" noValidate>
      {section(
        texts.sections.identity,
        <>
          {input("name", true, 120, { autoComplete: "organization" })}
          {isVenue && select("venueActivity", true, venueActivityOptions)}
        </>,
      )}

      {section(
        texts.sections.contact,
        <>
          <p className="text-sm text-muted">{texts.contactIntro}</p>
          {input("contactEmail", false, 254, { type: "email", inputMode: "email", autoComplete: "email" })}
          {input("contactPhone", false, 30, { type: "tel", inputMode: "tel", autoComplete: "tel" })}
          {input("contactUrl", false, 500, { type: "url", inputMode: "url", autoComplete: "url" })}
        </>,
      )}

      {section(
        texts.sections.about,
        isProfessional ? (
          <>
            {input("oneLiner", true, 120)}
            {input("seekingOffering", false, 200)}
          </>
        ) : (
          <>
            {input("oneLiner", false, 120)}
            {input("whenToVisit", false, 120)}
            {select("usualCategory", false, categoryOptions)}
            {textArea("whatForWhom", isVenue, 500)}
            {isVenue ? textArea("whatTheyOffer", true, 500) : textArea("howSustained", false, 500)}
          </>
        ),
      )}

      {section(
        texts.sections.place,
        isProfessional ? (
          select("neighborhoodSlug", false, neighborhoodOptions)
        ) : (
          <>
            {field("address", isVenue, (describedBy, invalid, id) => (
              <AddressField
                id={id}
                defaultValue={valueOf("address")}
                required={isVenue}
                describedBy={describedBy}
                invalid={invalid}
                texts={texts.geocode}
                locate={locateProfileAddress}
              />
            ))}
            {locationPicker}
            <PointFieldInputs />
          </>
        ),
      )}

      {!isProfessional && section(texts.sections.story, textArea("story", false, 1000))}

      {isProfessional &&
        section(
          texts.sections.google,
          <label className="flex items-start gap-3">
            <input
              type="checkbox"
              name="indexable"
              defaultChecked={valueOf("indexable") === "on"}
              className="mt-1 size-5 focus-visible:outline-2 focus-visible:outline-light"
            />
            <span>
              {texts.labels.indexable}
              {texts.hints.indexable && <span className="block text-sm text-muted">{texts.hints.indexable}</span>}
            </span>
          </label>,
        )}

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
