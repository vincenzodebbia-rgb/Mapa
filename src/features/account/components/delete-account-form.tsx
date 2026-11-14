"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { deleteAccount } from "../actions";
import { INITIAL_DELETE_ACCOUNT_STATE, type DeleteAccountTexts } from "../types";

/**
 * "Eliminar cuenta" con conferma scritta (la parola ELIMINAR). La pagina spiega prima cosa si cancella: account, realtà,
 * eventi, scheda e vecchi indirizzi, risposte, NIF. Non si può annullare.
 */
export function DeleteAccountForm({ texts }: { texts: DeleteAccountTexts }) {
  const [state, formAction, pending] = useActionState(deleteAccount, INITIAL_DELETE_ACCOUNT_STATE);
  const errorId = "cuenta-confirm-error";

  return (
    <form key={state.attempt} action={formAction} className="flex flex-col gap-3" noValidate>
      <label htmlFor="cuenta-confirm" className="font-medium">
        {texts.confirmLabel}
      </label>
      <Input
        id="cuenta-confirm"
        name="confirm"
        autoComplete="off"
        autoCapitalize="characters"
        spellCheck={false}
        maxLength={20}
        aria-describedby={state.error ? errorId : undefined}
        aria-invalid={state.error === "wrongWord" || undefined}
      />
      {state.error && (
        <p id={errorId} role="alert" className="text-danger">
          {texts.errors[state.error]}
        </p>
      )}
      <Button type="submit" variant="secondary" disabled={pending} className="self-start">
        {pending ? texts.sending : texts.button}
      </Button>
    </form>
  );
}
