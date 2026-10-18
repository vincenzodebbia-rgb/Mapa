import type { ComponentProps } from "react";

/** Neutral placeholder input: tokens only. Always pair it with a visible <label>. */
export function Input({ className = "", ...props }: ComponentProps<"input">) {
  return (
    <input
      className={`min-h-11 w-full rounded-card border border-line bg-surface px-3 text-ink placeholder:text-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-light ${className}`}
      {...props}
    />
  );
}
