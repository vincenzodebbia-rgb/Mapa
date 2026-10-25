import "server-only";
import { t } from "@/lib/i18n/t";

/** Texts of the shared shell of the text pages, read once on the server. */
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
