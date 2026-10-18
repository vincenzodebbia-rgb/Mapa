import { getTranslations } from "next-intl/server";
import { brand } from "@/config/brand";

// Placeholder home until the "Hoy" map arrives (session 3).
export default async function HomePage() {
  const t = await getTranslations("home");

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-3 p-6 text-center">
      <h1 className="font-display text-3xl font-semibold">{brand.appName}</h1>
      <p className="text-muted">{brand.tagline}</p>
      <p>{t("comingSoon")}</p>
    </main>
  );
}
