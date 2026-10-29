import type { Metadata } from "next";
import { brand } from "@/config/brand";
import { flags } from "@/config/flags";
import { t } from "@/lib/i18n/t";
import { getPageRobots } from "@/lib/seo/robots";
import { getSiteUrl } from "@/lib/site-url";
import "./globals.css";

// Text-only Open Graph: no image until the visual identity exists (docs/SPEC.md §5, §11).
export const metadata: Metadata = {
  metadataBase: getSiteUrl(),
  title: { default: brand.appName, template: `%s · ${brand.appName}` },
  description: brand.shortDescription,
  openGraph: { siteName: brand.appName, locale: "es_ES", type: "website" },
  robots: getPageRobots(true),
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // data-demo gives the banner its room (--app-top-offset in globals.css).
    <html lang="es" data-demo={flags.demo ? "" : undefined}>
      <body className="min-h-dvh bg-night font-sans text-ink antialiased">
        {flags.demo && (
          <p
            role="note"
            className="sticky top-0 z-50 h-(--app-top-offset) truncate bg-light px-3 text-center text-sm leading-(--app-top-offset) font-semibold text-night"
          >
            {t("demo.banner")}
          </p>
        )}
        {children}
      </body>
    </html>
  );
}
