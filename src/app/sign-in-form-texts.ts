import "server-only";
import type { SignInFormTexts } from "@/features/auth/types";
import { t } from "@/lib/i18n/t";

/** Testi del modulo di accesso, comuni a /entrar e /registro (visitatore anonimo). */
export function getSignInFormTexts(): SignInFormTexts {
  return {
    emailLabel: t("auth.emailLabel"),
    emailHint: t("auth.emailHint"),
    submit: t("auth.submit"),
    sending: t("auth.sending"),
    sent: t("auth.sent"),
    noScript: t("auth.noScript"),
    errors: {
      invalidEmail: t("auth.errors.invalidEmail"),
      robot: t("auth.errors.robot"),
      tooMany: t("auth.errors.tooMany"),
      generic: t("auth.errors.generic"),
    },
  };
}
