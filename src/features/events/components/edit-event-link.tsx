"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getButtonClasses } from "@/components/ui/button";
import { fetchViewer } from "@/lib/viewer";

type EditEventLinkProps = { eventId: string; label: string };

/**
 * "Editar" sulla pagina pubblica di un evento, solo per i membri dell'organizzazione che l'ha creato. Isola client:
 * la pagina resta statica e in cache. È solo un link: la pagina di modifica, l'action e la RLS ricontrollano tutto.
 */
export function EditEventLink({ eventId, label }: EditEventLinkProps) {
  const [canEdit, setCanEdit] = useState(false);

  useEffect(() => {
    let active = true;
    void fetchViewer(eventId).then((viewer) => {
      if (active) setCanEdit(viewer.canEditEvent);
    });
    return () => {
      active = false;
    };
  }, [eventId]);

  if (!canEdit) return null;
  return (
    <Link href={`/panel/eventos/${eventId}`} className={`${getButtonClasses("secondary")} self-start`}>
      {label}
    </Link>
  );
}
