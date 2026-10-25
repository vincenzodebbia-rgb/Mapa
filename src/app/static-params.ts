// ensureStatic = 'navigation' needs generateStaticParams with at least one value. This one is not a valid slug:
// the page answers notFound() before any query, so `next build` never needs the database.
// Real pages are generated, completely, on their first visit.
export const STATIC_PARAMS_PLACEHOLDER = "__";
