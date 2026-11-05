export type SignInError = "invalidEmail" | "robot" | "tooMany" | "generic";

/** State of the sign-in form. `sent` is the same for every email: it never tells whether an account exists. */
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
