"use client";

import Script from "next/script";
import { useEffect, useRef, useState } from "react";

// Cloudflare Turnstile (anti-robot) sui moduli pubblici. Script di terzi già ammesso dalla CSP
// (script-src e frame-src challenges.cloudflare.com): nessun cookie nostro, nessun tracciamento. Il token finisce in un
// campo nascosto `cf-turnstile-response` dentro il modulo e si verifica sul server (src/lib/turnstile.ts).

type TurnstileApi = {
  render: (container: HTMLElement, options: Record<string, unknown>) => string;
  reset: (widgetId: string) => void;
  remove: (widgetId: string) => void;
};

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

const SCRIPT_URL = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

type TurnstileWidgetProps = {
  siteKey: string | undefined;
  /** Da cambiare dopo ogni invio: un token vale una volta sola, così il widget ne chiede uno nuovo. */
  resetSignal: unknown;
};

export function TurnstileWidget({ siteKey, resetSignal }: TurnstileWidgetProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  const [scriptReady, setScriptReady] = useState(false);

  useEffect(() => {
    const api = window.turnstile;
    if (!siteKey || !scriptReady || !api || !containerRef.current || widgetIdRef.current) return;
    widgetIdRef.current = api.render(containerRef.current, { sitekey: siteKey, language: "es", theme: "auto" });
    return () => {
      if (widgetIdRef.current) api.remove(widgetIdRef.current);
      widgetIdRef.current = null;
    };
  }, [siteKey, scriptReady]);

  useEffect(() => {
    if (widgetIdRef.current) window.turnstile?.reset(widgetIdRef.current);
  }, [resetSignal]);

  if (!siteKey) return null;
  return (
    <>
      <Script src={SCRIPT_URL} strategy="afterInteractive" onReady={() => setScriptReady(true)} />
      <div ref={containerRef} className="min-h-16" />
    </>
  );
}
