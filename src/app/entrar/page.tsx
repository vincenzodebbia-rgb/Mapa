import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ContentPage } from "@/components/ui/content-page";
import { SignInForm } from "@/features/auth/components/sign-in-form";
import { getPublicEnv } from "@/lib/env";
import { t } from "@/lib/i18n/t";
import { getCurrentUserId } from "@/lib/supabase/current-user";
import { getContentPageTexts } from "../content-page-texts";

// Reads the session: blocking on purpose, so a logged-in visitor gets a real redirect.
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
      <SignInForm
        turnstileSiteKey={getPublicEnv().NEXT_PUBLIC_TURNSTILE_SITE_KEY}
        texts={{
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
        }}
      />
    </ContentPage>
  );
}
