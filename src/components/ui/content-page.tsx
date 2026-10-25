import Link from "next/link";
import type { ReactNode } from "react";

type FooterLink = { href: string; label: string };

type ContentPageProps = {
  backLabel: string;
  footerLabel: string;
  footerLinks: FooterLink[];
  children: ReactNode;
};

const linkClass = "underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-light";

/** Neutral shell of the text pages (profile, event, barrio, qué es, legal). Mobile first, tokens only. */
export function ContentPage({ backLabel, footerLabel, footerLinks, children }: ContentPageProps) {
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-2xl flex-col gap-6 p-4">
      <header>
        <Link href="/" className={`text-sm text-muted ${linkClass}`}>
          {backLabel}
        </Link>
      </header>
      <main className="flex flex-1 flex-col gap-6">{children}</main>
      <footer>
        <nav aria-label={footerLabel} className="flex flex-wrap gap-4 border-t border-line pt-4 text-sm text-muted">
          {footerLinks.map((link) => (
            <Link key={link.href} href={link.href} className={linkClass}>
              {link.label}
            </Link>
          ))}
        </nav>
      </footer>
    </div>
  );
}
