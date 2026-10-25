"use client";

import { useState, useSyncExternalStore } from "react";
import { Button } from "@/components/ui/button";
import { buildWhatsAppShareUrl, resolveShareUrl } from "../share-links";

export type ShareButtonTexts = {
  share: string;
  whatsapp: string;
  copy: string;
  copied: string;
  copyFailed: string;
};

type ShareButtonProps = {
  title: string;
  /** Text that goes with the link (title, date, place). */
  text: string;
  /** Absolute URL of the page on the site's own domain: used only until the browser knows where it is. */
  fallbackUrl: string;
  texts: ShareButtonTexts;
};

// Browser-only values read with useSyncExternalStore: the server and the hydration render use the server value,
// so the markup matches; right after, the browser value replaces it. Neither value changes while the page is open.
function subscribeNever() {
  return () => {};
}
function canWebShare() {
  return typeof navigator.share === "function";
}
function cannotWebShareOnServer() {
  return false;
}

/** "Compartir": the system share sheet where available; WhatsApp link and copy always (the link works without JS). */
export function ShareButton({ title, text, fallbackUrl, texts }: ShareButtonProps) {
  const webShare = useSyncExternalStore(subscribeNever, canWebShare, cannotWebShareOnServer);
  const url = useSyncExternalStore(
    subscribeNever,
    () => resolveShareUrl(window.location, fallbackUrl),
    () => fallbackUrl,
  );
  const [status, setStatus] = useState("");

  async function shareWithSystem() {
    try {
      await navigator.share({ title, text, url });
    } catch {
      // Closed by the person or not allowed: WhatsApp and copy are still there.
    }
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(url);
      setStatus(texts.copied);
    } catch {
      setStatus(texts.copyFailed);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        {webShare && <Button onClick={shareWithSystem}>{texts.share}</Button>}
        <a
          href={buildWhatsAppShareUrl(text, url)}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-11 items-center justify-center rounded-pill border border-line bg-surface px-5 font-medium text-ink hover:bg-night focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-light"
        >
          {texts.whatsapp}
        </a>
        <Button variant="secondary" onClick={copyLink}>
          {texts.copy}
        </Button>
      </div>
      <p aria-live="polite" className="min-h-5 text-sm text-muted">
        {status}
      </p>
    </div>
  );
}
