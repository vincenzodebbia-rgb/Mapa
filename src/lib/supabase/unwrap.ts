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
 * Turns a Supabase `{ data, error }` result into data or a thrown error, so no call can ignore `error`.
 * Remember: an RLS-denied SELECT is not an error, it returns an empty list.
 */
export function unwrap<T>(result: { data: T; error: SupabaseErrorLike | null }): T {
  if (result.error) {
    throw new SupabaseQueryError(result.error);
  }
  return result.data;
}
