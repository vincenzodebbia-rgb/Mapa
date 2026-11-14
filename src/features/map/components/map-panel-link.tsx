import Link from "next/link";

/**
 * "Mi panel" nell'intestazione delle mappe Hoy e Conexiones. Queste pagine sono già calcolate a ogni richiesta (mai in
 * cache): la pagina passa l'etichetta solo se c'è una sessione, altrimenti null e qui non compare niente.
 */
export function MapPanelLink({ label }: { label: string | null }) {
  if (!label) return null;
  return (
    <Link
      href="/panel"
      className="ml-auto inline-flex min-h-11 items-center px-2 text-sm font-medium underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-light"
    >
      {label}
    </Link>
  );
}
