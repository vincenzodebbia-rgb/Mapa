import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getButtonClasses } from "@/components/ui/button";
import { ContentPage } from "@/components/ui/content-page";
import { DeleteAccountForm } from "@/features/account/components/delete-account-form";
import { t } from "@/lib/i18n/t";
import { getCurrentUserId } from "@/lib/supabase/current-user";
import { getContentPageTexts } from "../../content-page-texts";

// Privata, a ogni richiesta: bloccante di proposito, così i redirect sono veri.
export const instant = false;

export const metadata: Metadata = { title: t("cuenta.metaTitle"), robots: { index: false, follow: false } };

/** "Mi cuenta" (docs/piani/sessione-7.md §5): scaricare i propri dati ed eliminare l'account (sempre con la realtà). */
export default async function AccountPage() {
  const userId = await getCurrentUserId();
  if (!userId) redirect("/entrar");

  return (
    <ContentPage {...getContentPageTexts()}>
      <h1 className="font-display text-2xl font-semibold">{t("cuenta.title")}</h1>

      <section className="flex flex-col gap-3">
        <h2 className="font-display text-lg font-semibold">{t("cuenta.download.heading")}</h2>
        <p>{t("cuenta.download.body")}</p>
        {/* Un link normale: il browser scarica il file (Content-Disposition), senza JavaScript. */}
        <a href="/panel/cuenta/datos" download className={`${getButtonClasses("secondary")} self-start`}>
          {t("cuenta.download.button")}
        </a>
      </section>

      <section className="flex flex-col gap-3 border-t border-line pt-4">
        <h2 className="font-display text-lg font-semibold">{t("cuenta.delete.heading")}</h2>
        <p>{t("cuenta.delete.body")}</p>
        <DeleteAccountForm
          texts={{
            confirmLabel: t("cuenta.delete.confirmLabel"),
            button: t("cuenta.delete.button"),
            sending: t("cuenta.delete.sending"),
            errors: {
              wrongWord: t("cuenta.delete.wrongWord"),
              tooMany: t("cuenta.delete.tooMany"),
              failed: t("cuenta.delete.failed"),
            },
          }}
        />
      </section>

      <Link href="/panel" className="underline underline-offset-2 focus-visible:outline-2 focus-visible:outline-light">
        {t("eventForm.back")}
      </Link>
    </ContentPage>
  );
}
