export type SignInError = "invalidEmail" | "robot" | "tooMany" | "generic";

/** Stato del modulo di accesso. `sent` è uguale per ogni email: non rivela mai se un account esiste. */
export type SignInState = { ok: boolean; sent: boolean; error: SignInError | null; attempt: number };

export const INITIAL_SIGN_IN_STATE: SignInState = { ok: false, sent: false, error: null, attempt: 0 };

export type SignInFormTexts = {
  emailLabel: string;
  emailHint: string;
  submit: string;
  sending: string;
  sent: string;
  noScript: string;
  errors: Record<SignInError, string>;
};
