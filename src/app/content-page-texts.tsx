import "server-only";
import { PanelLink } from "@/features/auth/components/panel-link";
import { t } from "@/lib/i18n/t";

const headerLinkClass =
  "text-sm font-medium underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-light";

/**
 * Testi e intestazione del guscio comune delle pagine di testo, letti una volta sul server.
 * "Mi panel" è un'isola client: la pagina resta statica e lo mostra solo a chi ha una sessione.
 */
export function getContentPageTexts() {
  return {
    backLabel: t("page.backToMap"),
    footerLabel: t("page.footer.label"),
    footerLinks: [
      { href: "/que-es", label: t("page.footer.queEs") },
      { href: "/legal", label: t("page.footer.legal") },
    ],
    headerEnd: <PanelLink label={t("nav.panel")} className={headerLinkClass} />,
  };
}
