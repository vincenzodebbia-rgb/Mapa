import type { ComponentProps } from "react";

type ButtonVariant = "primary" | "secondary";

const variantClasses: Record<ButtonVariant, string> = {
  primary: "bg-light text-night hover:opacity-90",
  secondary: "border border-line bg-surface text-ink hover:bg-night",
};

type ButtonProps = ComponentProps<"button"> & { variant?: ButtonVariant };

/** Le classi del pulsante, anche per un link che deve sembrare un pulsante (per esempio un mailto). */
export function getButtonClasses(variant: ButtonVariant = "primary"): string {
  return `inline-flex min-h-11 items-center justify-center rounded-pill px-5 font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-light disabled:opacity-50 ${variantClasses[variant]}`;
}

/** Pulsante neutro provvisorio: solo token, si ridisegna nella fase di design (docs/DESIGN_HANDOFF.md). */
export function Button({ variant = "primary", type = "button", className = "", ...props }: ButtonProps) {
  return <button type={type} className={`${getButtonClasses(variant)} ${className}`} {...props} />;
}
