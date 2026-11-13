import type { ComponentProps } from "react";

/** Campo di testo neutro provvisorio: solo token. Va sempre con una <label> visibile. */
export function Input({ className = "", ...props }: ComponentProps<"input">) {
  return (
    <input
      className={`min-h-11 w-full rounded-card border border-line bg-surface px-3 text-ink placeholder:text-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-light ${className}`}
      {...props}
    />
  );
}
