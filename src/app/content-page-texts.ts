import "server-only";
import { t } from "@/lib/i18n/t";

/** Testi del guscio comune delle pagine di testo, letti una volta sul server. */
export function getContentPageTexts() {
  return {
    backLabel: t("page.backToMap"),
    footerLabel: t("page.footer.label"),
    footerLinks: [
      { href: "/que-es", label: t("page.footer.queEs") },
      { href: "/legal", label: t("page.footer.legal") },
    ],
  };
}
