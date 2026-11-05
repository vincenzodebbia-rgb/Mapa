/**
 * Flag delle funzioni. Ogni flag ha un responsabile e una scadenza: entro quella data si toglie il flag (e il codice morto).
 * Le funzioni non finite restano dietro un flag; non si cancellano.
 */
export const flags = {
  intro: false, // copertina/animazione iniziale — aspetta l'identità visiva (docs/DESIGN_HANDOFF.md). Scade: fase di design.
  threads: false, // hilos (linee su /conexiones, sezione del panel). Spento fino a dopo il lancio; /conexiones in sé non dipende dal flag. Scade: 2027-03-31.
  professionals: true, // /profesionales + spaces. Scade: 2027-03-31.
  annualMemory: false, // /panel/memoria/[year]. Scade: 2027-06-30.
  openFeeds: false, // esportazioni iCal/JSON/ActivityPub (modello dati pronto, non costruite). Scade: 2027-06-30.
  // Sito demo privato (progetto Vercel mapa-demo sui dati di mapa-dev): banner + noindex + sitemap vuota.
  // Lo accende solo il valore esatto "1". Letto al build (NEXT_PUBLIC_*): se cambia, rifai il deploy. Scade: 2027-03-31.
  demo: isDemoValue(process.env.NEXT_PUBLIC_DEMO),
} as const;

export function isDemoValue(value: string | undefined): boolean {
  return value === "1";
}
