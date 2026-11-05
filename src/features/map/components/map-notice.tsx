/** Un breve messaggio di stato sopra la mappa o l'elenco (giorni vuoti, nessun risultato). Mai contenuti finti. */
export function MapNotice({ message }: { message: string }) {
  return (
    <p role="status" className="rounded-card border border-line bg-night/90 p-3 text-sm">
      {message}
    </p>
  );
}
