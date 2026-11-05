import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ContentPage } from "@/components/ui/content-page";
import { SignOutButton } from "@/features/auth/components/sign-out-button";
import { getOrganizationForUser } from "@/features/organizations/data";
import { t } from "@/lib/i18n/t";
import { getCurrentUserId } from "@/lib/supabase/current-user";
import { getContentPageTexts } from "../content-page-texts";

// Provisional panel (session 5): name, public profile and "Salir". The real home arrives with sessions 6-7.
// Private, per request: blocking on purpose so the redirects are real.
export const instant = false;

export const metadata: Metadata = { title: t("panel.metaTitle"), robots: { index: false, follow: false } };

export default async function PanelPage() {
  const userId = await getCurrentUserId();
  if (!userId) redirect("/entrar");
  const organization = await getOrganizationForUser(userId);
  if (!organization) redirect("/registro");

  return (
    <ContentPage {...getContentPageTexts()}>
      <h1 className="font-display text-2xl font-semibold">{t("panel.title", { name: organization.name })}</h1>
      <p className="text-muted">{t("panel.intro")}</p>
      <Link
        href={`/a/${organization.slug}`}
        className="underline underline-offset-2 focus-visible:outline-2 focus-visible:outline-light"
      >
        {t("panel.viewProfile")}
      </Link>
      <SignOutButton label={t("auth.signOut")} />
    </ContentPage>
  );
}
