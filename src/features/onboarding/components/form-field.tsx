import type { ReactNode } from "react";

type FormFieldProps = {
  id: string;
  label: string;
  hint?: string;
  error?: string;
  /** "(opcional)" / "(obligatorio)" accanto all'etichetta. */
  marker: string;
  children: (describedBy: string | undefined, invalid: boolean) => ReactNode;
};

/** Etichetta + campo + aiuto + errore, collegati con aria-describedby. */
export function FormField({ id, label, hint, error, marker, children }: FormFieldProps) {
  const describedBy = [hint ? `${id}-hint` : null, error ? `${id}-error` : null].filter(Boolean).join(" ") || undefined;
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="font-medium">
        {label} <span className="text-sm font-normal text-muted">{marker}</span>
      </label>
      {children(describedBy, Boolean(error))}
      {hint && (
        <p id={`${id}-hint`} className="text-sm text-muted">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} className="text-sm text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
