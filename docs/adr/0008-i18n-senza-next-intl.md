# Testi dell'interfaccia senza next-intl

Status: accepted (2026-10-22). Sostituisce la voce "next-intl" della riga Stack in AGENTS.md (ADR 0001 rimanda qui).

## Decisione
Si toglie `next-intl`. I testi dell'interfaccia restano **tutti e solo** in `messages/es.json`, con le stesse chiavi.
Al loro posto c'è un sistema minimo in `src/lib/i18n/`:
- `t(key, values?)` (`import 'server-only'`): legge `messages/es.json`; `key` è tipizzata sulle chiavi del file
  (una chiave inesistente è un errore di typecheck); sostituzione semplice delle `{variabili}`.
- `format.ts`: le funzioni pure (ricerca della chiave e sostituzione), con test Vitest.
- I componenti client non leggono i messaggi: ricevono i testi già pronti come props dalla pagina server.

Il sito è solo in spagnolo, senza lingua nell'URL, come prima. Il fuso orario resta in `src/lib/dates.ts`.

## Perché
- Smart App Control di Windows (acceso sul computer del fondatore, e resta acceso) blocca il binario nativo di
  `@swc/core` (`swc.win32-x64-msvc.node`, errore 4551 `ERR_DLOPEN_FAILED`): il file non è firmato e non ha
  "reputazione". Il binario di Next stesso (`@next/swc-win32-x64-msvc`) invece si carica.
- `next-intl@4.14.9` carica `@swc/core` **sempre**: il plugin lo importa in modo statico (`require('@swc/core')` in
  `dist/cjs/development/plugin.cjs`, e nella versione ESM tramite `ExtractionCompiler` → `MessageExtractor`), anche se
  serve solo alla funzione sperimentale di estrazione dei messaggi (`experimental.extract` / `useExtracted`), che non
  usiamo. Nessuna opzione documentata evita il caricamento finché il plugin resta in `next.config.ts`.
- Risultato verificato il 21-22 ottobre 2026 (dopo `npm ci`): `next dev`, `next build` e `npm run typecheck`
  (`next typegen`) falliscono tutti mentre caricano `next.config.ts`.
- Per una sola lingua serve pochissimo: leggere una chiave e sostituire qualche variabile. Una dipendenza in meno
  è anche meno superficie da aggiornare.

## Conseguenze
- Niente plurali, formattazione ICU, `<Rich>` né hook client: se servono, si scrivono testi separati o si formatta
  in TypeScript (date e orari sempre con `src/lib/dates.ts`, numeri e prezzi con `Intl.NumberFormat('es-ES')`).
- Nessun testo nei componenti, come prima: la regola resta in AGENTS.md.
- I componenti client ricevono le etichette come props (oggetti piccoli e tipizzati), mai l'intero file dei messaggi.

## Come si torna a una libreria
Quando servirà una seconda lingua (l'italiano è previsto, SPEC §13):
1. Nuovo ADR. Scegliere una libreria che non carichi binari nativi non firmati (o verificare che Smart App Control
   la lasci passare), per esempio `next-intl` in una versione che non importi `@swc/core` in modo statico.
2. Le chiavi di `messages/es.json` non cambiano: si aggiunge `messages/it.json` con le stesse chiavi.
3. Si sostituisce l'implementazione di `t()` in `src/lib/i18n/` (stessa firma) e si decide come scegliere la lingua
   (URL, cookie o intestazione). Le pagine che chiamano `t()` restano uguali; le props dei componenti client anche.
