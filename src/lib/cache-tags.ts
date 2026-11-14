// Tag della cache condivisi tra blocchi: chi legge (organizations, map) e chi scrive (onboarding, poi "Mi ficha")
// devono usare lo stesso valore, ma un blocco non può importare un altro blocco.
export const ORGANIZATIONS_TAG = "organizations";

// Eventi: li legge il blocco events (pagina evento, elenchi) e map (barrios). Li aggiornano le scritture degli eventi e
// "Mi ficha" (il nome e lo slug dell'organizzazione compaiono nelle pagine evento).
export const EVENTS_TAG = "events";
