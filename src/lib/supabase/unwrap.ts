type SupabaseErrorLike = { message: string; code?: string };

export class SupabaseQueryError extends Error {
  readonly code: string | undefined;

  constructor(error: SupabaseErrorLike) {
    super(error.message);
    this.name = "SupabaseQueryError";
    this.code = error.code;
  }
}

/**
 * Trasforma un risultato Supabase `{ data, error }` nei dati oppure in un errore lanciato, così nessuna chiamata può
 * ignorare `error`. Attenzione: una SELECT negata dalla RLS non è un errore, restituisce un elenco vuoto.
 */
export function unwrap<T>(result: { data: T; error: SupabaseErrorLike | null }): T {
  if (result.error) {
    throw new SupabaseQueryError(result.error);
  }
  return result.data;
}
