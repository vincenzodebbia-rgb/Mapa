Questo blocco possiede la revisione del fondatore (/revision, solo `is_admin()`) e "Mi cuenta" (/panel/cuenta, sessione 7).
Contratto: data.ts (letture server-only), actions.ts, schema.ts, types.ts, components/. Nient'altro si importa da fuori.
Revisione: solo i dati di admin_review_list() (mai NIF, email, telefono, id utente).
"Descargar mis datos": GET /panel/cuenta/datos (Route Handler in src/app) → getMyDataExport() → export_my_data(), letto come l'utente. Risposta `private, no-store`, file `mis-datos-<data>.json`, 10 all'ora per utente. Mai i dati nei log.
"Eliminar cuenta": un account = una realtà. deleteAccount: parola ELIMINAR (schema.ts) → utente → limite → prima i file di Storage (logo, con il client dell'utente e la policy di org-logos) → delete_my_account() (elimina sempre la realtà, eventi, risposte, NIF, vecchi slug, poi l'utente) → signOut → updateTag(ORGANIZATIONS_TAG, EVENTS_TAG) → "/". La pagina spiega prima cosa si cancella.
