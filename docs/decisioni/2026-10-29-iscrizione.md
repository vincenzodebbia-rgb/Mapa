# Decisioni sull'iscrizione — 29 ottobre 2026 (per la sessione 5)

> Decisioni del fondatore. Prevalgono su `docs/SPEC.md`, `docs/DATA_MODEL.md` e `docs/decisioni/2026-10-iscrizione.md` dove li contraddicono.
> Da applicare ai documenti all'inizio della sessione 5, poi spostare in `docs/decisioni/2026-10-29-iscrizione.md`.
> Testi dell'interfaccia in spagnolo (`messages/es.json`); nomi nel codice in inglese.
> **Applicato il 2026-10-30** (sessione 5, ramo `feat/onboarding`) a SPEC, DATA_MODEL, PRIVACY_AND_OWNERSHIP, glossary e
> BUILD_PLAN, con queste scelte del fondatore sul piano:
> - nessun invio di email nella sessione 5: l'avviso resta nel database (`flagged_for_review` + `flag_reason`) e si legge in una
>   pagina privata minima `/revision` (solo admin, sola lettura, mai NIF né email). Il servizio email si decide con il dominio,
>   prima del pilota (bloccante anche per i link magici a utenti veri);
> - destinatario futuro degli avvisi: variabile server `FOUNDER_NOTIFICATION_EMAIL`, nessuna email in `brand.ts`;
> - Entidad pública: NIF P/Q/S **riusabile** (molti centri usano il NIF del Comune) e avviso **sempre**, anche al primo uso;
> - `what_they_offer` per le attività commerciali; `how_sustained` resta per le associazioni;
> - Actividad comercial: NIF con lettera A, B, E o J;
> - Entidad pública: indirizzo facoltativo;
> - mappatura: fundación, cooperativa ed entidad pública → `kind = 'association'`; actividad comercial → `venue`;
>   gente que hace cosas → `professional`; la categoria "Comerciantes…" del Comune non si importa.

## 1. Prima domanda dell'iscrizione: "¿Qué sois?"
L'iscrizione parte chiedendo il tipo di realtà. Il NIF e le domande dipendono dalla risposta.

| Opzione (UI) | Esempi | NIF | Avviso al fondatore |
|---|---|---|---|
| Asociación | culturali, vicinali, ONG | **obbligatorio**, formato ente (G) | no se è nell'elenco del Comune; **sì** se non è nell'elenco e non ha invito |
| Fundación | fondazioni culturali o sociali | **obbligatorio**, formato ente (G) | come le associazioni |
| Cooperativa | cooperative culturali o di lavoro | **obbligatorio**, formato ente (F) | come le associazioni |
| Entidad pública | centro cultural municipal, biblioteca | **obbligatorio**, formato ente (P, Q, S) | no |
| Actividad comercial | bar, librería, galería, estudio, café cultural | **facoltativo**, solo NIF d'impresa | **sì** se senza NIF, oppure con attività "dubbia"; no se ha NIF d'impresa e attività "tranquilla" |
| Gente que hace cosas | artisti, collettivi senza forma giuridica | nessuno | no |

- Sotto il campo NIF dell'Actividad comercial, una riga di aiuto: *"Si tu NIF es tu DNI personal o eres autónomo/a, no lo pongas."* Il sistema rifiuta comunque qualunque NIF in formato DNI/NIE (mai documenti personali).
- Gli autonomi soli non hanno una strada propria: gli artisti entrano come "Gente que hace cosas"; un bar o una libreria gestiti da un autonomo entrano come "Actividad comercial" senza NIF.
- Un invito valido fa sempre entrare senza avviso, qualunque tipo.
- Chi è "Actividad comercial" **senza NIF** può indicare un **link pubblico** che mostri che il luogo esiste (web, Instagram, Google Maps): **facoltativo** (deciso dal fondatore il 29 ottobre: un bar di quartiere può non avere né web né social). Il link, se c'è, compare nell'avviso al fondatore per aiutarlo a verificare.

## 2. Domande per l'Actividad comercial
Quando si sceglie "Actividad comercial" compaiono le tre domande già decise per gli espacios (revisione del 21 ottobre §3):
1. "¿Quiénes sois?" (obbligatoria, max 500)
2. Tipo de actividad (obbligatorio, elenco esistente: Librería · Sala pequeña · Centro cultural · Galería · Taller o estudio · Café cultural · Discoteca o club · Bar nocturno · Otro)
3. "¿Qué ofrecéis a nivel cultural?" (obbligatoria, max 500)
Indirizzo obbligatorio (è un luogo).

## 3. Elenco del Comune
- Le associazioni della categoria **"Comerciantes, empresarios, profesionales y autónomos"** (157) **non vengono riconosciute** dal NIF: se si iscrivono entrano come associazione **fuori elenco** (quindi con avviso al fondatore).
- Associazione **fuori elenco e senza invito** (es. appena nata): **entra subito, con avviso al fondatore**.

## 4. Niente etichette sulla mappa
Nessuna etichetta o "banda" del tipo di realtà sulla mappa né nei riquadri della mappa: sul telefono meno elementi = più chiarezza. Il tipo resta un dato interno (filtri "Quién organiza", revisione del fondatore).

## 5. Conseguenze per il modello dati (da proporre nel piano della sessione 5)
- Nuovo campo per la forma giuridica (es. enum `entity_type`: `association`, `foundation`, `cooperative`, `public_entity`, `commercial`) e collegamento con `org_kind` esistente (`association` / `venue` / `professional`). Claude propone nel piano la mappatura (per esempio: fundación, cooperativa ed entidad pública con gli stessi diritti di un'associazione; actividad comercial = `venue`).
- Il vincolo "association/venue deve avere un NIF" va adattato: per `venue` commerciale il NIF diventa facoltativo.
- Regole del formato NIF per tipo (G, F, P/Q/S, A/B per le imprese).
- Logica dell'avviso al fondatore secondo la tabella del §1.
