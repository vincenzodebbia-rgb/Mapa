"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TurnstileWidget } from "@/components/ui/turnstile-widget";
import { requestMagicLink } from "../actions";
import { INITIAL_SIGN_IN_STATE, type SignInFormTexts } from "../types";

type SignInFormProps = { texts: SignInFormTexts; turnstileSiteKey: string | undefined };

/** Email → link magico. I testi arrivano dalla pagina sul server (i componenti client non leggono mai i messaggi). */
export function SignInForm({ texts, turnstileSiteKey }: SignInFormProps) {
  const [state, formAction, pending] = useActionState(requestMagicLink, INITIAL_SIGN_IN_STATE);

  if (state.sent) {
    return (
      <p role="status" className="rounded-card border border-line bg-surface p-4">
        {texts.sent}
      </p>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-4" noValidate>
      <div className="flex flex-col gap-1">
        <label htmlFor="sign-in-email" className="font-medium">
          {texts.emailLabel}
        </label>
        <Input
          id="sign-in-email"
          name="email"
          type="email"
          autoComplete="email"
          inputMode="email"
          required
          aria-describedby="sign-in-email-hint"
          aria-invalid={state.error === "invalidEmail" || undefined}
        />
        <p id="sign-in-email-hint" className="text-sm text-muted">
          {texts.emailHint}
        </p>
      </div>
      <TurnstileWidget siteKey={turnstileSiteKey} resetSignal={state.attempt} />
      <noscript>
        <p className="text-sm text-muted">{texts.noScript}</p>
      </noscript>
      {state.error && (
        <p role="alert" className="text-danger">
          {texts.errors[state.error]}
        </p>
      )}
      <Button type="submit" disabled={pending}>
        {pending ? texts.sending : texts.submit}
      </Button>
    </form>
  );
}
