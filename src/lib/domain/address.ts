import { z } from "zod";

/** Indirizzo da cercare sulla mappa ("Buscar en el mapa"): iscrizione ed eventi. Stessi limiti della colonna (≤ 200). */
export const addressSchema = z.preprocess((value) => (typeof value === "string" ? value : ""), z.string().trim().min(3).max(200));
