import type { Metadata } from "next";
import { flags } from "@/config/flags";

type PageRobots = Metadata["robots"];

/**
 * Il meta robots di una pagina. Ogni pagina che imposta `robots` deve usare questa funzione: in Next.js il `robots`
 * della pagina (anche `undefined`) sostituisce quello del layout, e il noindex della demo andrebbe perso.
 * Sito demo → noindex ovunque; non indicizzabile → noindex ma link seguiti (docs/SPEC.md §14);
 * altrimenti niente (indicizzata).
 */
export function getPageRobots(indexable: boolean, demo: boolean = flags.demo): PageRobots {
  if (demo) return { index: false, follow: false };
  return indexable ? undefined : { index: false, follow: true };
}
