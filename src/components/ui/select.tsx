import type { ComponentProps } from "react";

/** Menu a tendina neutro provvisorio: solo token. Va sempre con una <label> visibile. */
export function Select({ className = "", ...props }: ComponentProps<"select">) {
  return (
    <select
      className={`min-h-11 w-full rounded-card border border-line bg-surface px-3 text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-light ${className}`}
      {...props}
    />
  );
}
