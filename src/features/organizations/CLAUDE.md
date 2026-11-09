Questo blocco possiede `organizations` (la scheda pubblica) e il bucket di Storage `org-logos`.
Le pagine importano solo data.ts, types.ts e components/ (OrganizationProfile scrive da sé il proprio JSON-LD; OrganizationList per le pagine dei barrios).
Le letture pubbliche usano createSupabasePublicClient() (anon, niente cookie) dentro `'use cache'` + cacheLife("minutes") + cacheTag(ORGANIZATIONS_TAG): la pagina della scheda è completamente statica e risponde con un 404 vero. Ogni scrittura su una scheda (sessione 7, "Mi ficha") deve chiamare updateTag(ORGANIZATIONS_TAG).
Lettura privata: getOrganizationForUser(userId) (per /panel) usa createSupabaseServerClient() come l'utente, mai in cache; la RLS la limita alla membership dell'utente stesso.
I prossimi eventi nella scheda arrivano dal blocco events come slot (`upcoming`) composto dalla pagina: mai importare src/features/events.
"Gente que hace cosas" (professional): niente indirizzo, niente punto, niente "Nuestra historia" nella pagina; `indexable = false` vuol dire noindex e fuori dalla sitemap.
Logo: un solo WebP per organizzazione in `{organization_id}/logo.webp` (il database controlla il percorso). Far passare sempre i caricamenti da reencode-logo.ts (WebP, massimo 256×256, senza metadati) prima dello Storage. Cancellare il file prima di cancellare l'organizzazione.
Link di contatto: solo http/https (toSafeHttpUrl), link esterni con rel="noopener noreferrer nofollow ugc". Il testo del database si mostra come testo, mai come HTML.
