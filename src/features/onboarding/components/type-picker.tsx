import { Button } from "@/components/ui/button";
import type { TypeOption, TypePickerTexts } from "../types";

/** "¿Qué sois?": a GET form (`/registro?tipo=…`), so it works without JavaScript and survives a reload. */
export function TypePicker({ options, texts }: { options: TypeOption[]; texts: TypePickerTexts }) {
  return (
    <form method="get" action="/registro" className="flex flex-col gap-4">
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 font-display text-xl font-semibold">{texts.legend}</legend>
        {options.map((option, index) => (
          <label
            key={option.slug}
            className="flex cursor-pointer gap-3 rounded-card border border-line bg-surface p-3 has-checked:border-light has-focus-visible:outline-2 has-focus-visible:outline-light"
          >
            <input type="radio" name="tipo" value={option.slug} required={index === 0} className="mt-1 accent-light" />
            <span className="flex flex-col">
              <span className="font-medium">{option.label}</span>
              <span className="text-sm text-muted">{option.description}</span>
            </span>
          </label>
        ))}
      </fieldset>
      <Button type="submit">{texts.submit}</Button>
    </form>
  );
}
