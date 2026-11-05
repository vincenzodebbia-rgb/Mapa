// ensureStatic = 'navigation' vuole generateStaticParams con almeno un valore. Questo non è uno slug valido:
// la pagina risponde notFound() prima di ogni query, così `next build` non ha mai bisogno del database.
// Le pagine vere si generano, complete, alla loro prima visita.
export const STATIC_PARAMS_PLACEHOLDER = "__";
