import type { Metadata } from "next";
import { brand } from "@/config/brand";
import "./globals.css";

export const metadata: Metadata = {
  title: brand.appName,
  description: brand.shortDescription,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es">
      <body className="min-h-dvh bg-night font-sans text-ink antialiased">{children}</body>
    </html>
  );
}
