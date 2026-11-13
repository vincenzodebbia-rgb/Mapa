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
  /** Testo che accompagna il link (titolo, data, luogo). */
  text: string;
  /** URL assoluto della pagina sul dominio del sito: si usa solo finché il browser non sa dove si trova. */
  fallbackUrl: string;
  texts: ShareButtonTexts;
};

// Valori solo del browser letti con useSyncExternalStore: il server e il render di idratazione usano il valore del server,
// così il markup coincide; subito dopo il valore del browser lo sostituisce. Nessuno dei due cambia a pagina aperta.
function subscribeNever() {
  return () => {};
}
function canWebShare() {
  return typeof navigator.share === "function";
}
function cannotWebShareOnServer() {
  return false;
}

/** "Compartir": il pannello di condivisione del sistema dove c'è; link WhatsApp e copia sempre (il link va senza JS). */
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
      // Chiuso dalla persona o non permesso: WhatsApp e copia restano lì.
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
