import type { Metadata } from "next";
import { brand } from "@/config/brand";
import { getSiteUrl } from "@/lib/site-url";
import "./globals.css";

// Text-only Open Graph: no image until the visual identity exists (docs/SPEC.md §5, §11).
export const metadata: Metadata = {
  metadataBase: getSiteUrl(),
  title: { default: brand.appName, template: `%s · ${brand.appName}` },
  description: brand.shortDescription,
  openGraph: { siteName: brand.appName, locale: "es_ES", type: "website" },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es">
      <body className="min-h-dvh bg-night font-sans text-ink antialiased">{children}</body>
    </html>
  );
}
