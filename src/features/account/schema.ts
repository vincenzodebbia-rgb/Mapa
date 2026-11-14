import { z } from "zod";

/** La parola da scrivere per eliminare l'account: in maiuscolo, come la mostra la pagina. */
export const DELETE_CONFIRMATION_WORD = "ELIMINAR";

/** Conferma scritta di "Eliminar cuenta": solo la parola esatta (spazi attorno tollerati). */
export const deleteConfirmationSchema = z.preprocess(
  (value) => (typeof value === "string" ? value.trim() : value),
  z.literal(DELETE_CONFIRMATION_WORD),
);

/** Nome del file di "Descargar mis datos": la data del giorno, nessun dato personale. */
export function getExportFileName(now: Date): string {
  return `mis-datos-${now.toISOString().slice(0, 10)}.json`;
}
