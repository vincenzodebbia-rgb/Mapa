import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ContentPage } from "@/components/ui/content-page";
import { SignInForm } from "@/features/auth/components/sign-in-form";
import { getPublicEnv } from "@/lib/env";
import { t } from "@/lib/i18n/t";
import { getCurrentUserId } from "@/lib/supabase/current-user";
import { getContentPageTexts } from "../content-page-texts";
import { getSignInFormTexts } from "../sign-in-form-texts";

// Legge la sessione: bloccante di proposito, così chi ha già fatto l'accesso riceve un redirect vero.
export const instant = false;

export const metadata: Metadata = { title: t("auth.metaTitle"), robots: { index: false, follow: false } };

export default async function SignInPage({ searchParams }: PageProps<"/entrar">) {
  if (await getCurrentUserId()) redirect("/panel");
  const linkFailed = (await searchParams).error === "enlace";

  return (
    <ContentPage {...getContentPageTexts()}>
      <h1 className="font-display text-2xl font-semibold">{t("auth.title")}</h1>
      <p className="text-muted">{t("auth.intro")}</p>
      {linkFailed && (
        <p role="alert" className="text-danger">
          {t("auth.linkError")}
        </p>
      )}
      <SignInForm texts={getSignInFormTexts()} turnstileSiteKey={getPublicEnv().NEXT_PUBLIC_TURNSTILE_SITE_KEY} />
    </ContentPage>
  );
}
