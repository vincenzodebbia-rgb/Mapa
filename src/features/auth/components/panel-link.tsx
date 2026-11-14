"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { fetchViewer } from "@/lib/viewer";

type PanelLinkProps = { label: string; className?: string };

/**
 * "Mi panel" nell'intestazione delle pagine statiche: compare solo a chi ha una sessione. Isola client, così la pagina
 * resta statica e in cache; senza sessione non c'è nessun link (né verso /panel né verso /entrar o /registro).
 */
export function PanelLink({ label, className = "" }: PanelLinkProps) {
  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => {
    let active = true;
    void fetchViewer().then((viewer) => {
      if (active) setSignedIn(viewer.signedIn);
    });
    return () => {
      active = false;
    };
  }, []);

  if (!signedIn) return null;
  return (
    <Link href="/panel" className={className}>
      {label}
    </Link>
  );
}
