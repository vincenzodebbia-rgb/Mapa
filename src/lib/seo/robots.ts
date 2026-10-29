import type { Metadata } from "next";
import { flags } from "@/config/flags";

type PageRobots = Metadata["robots"];

/**
 * The robots meta of a page. Every page that sets `robots` must use this: in Next.js a page's `robots`
 * (even `undefined`) replaces the layout's, so the demo noindex would be lost.
 * Demo site → noindex everywhere; not indexable → noindex but links followed (docs/SPEC.md §14);
 * otherwise nothing (indexed).
 */
export function getPageRobots(indexable: boolean, demo: boolean = flags.demo): PageRobots {
  if (demo) return { index: false, follow: false };
  return indexable ? undefined : { index: false, follow: true };
}
