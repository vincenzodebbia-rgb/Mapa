import { Button } from "@/components/ui/button";
import { signOut } from "../actions";

/** "Salir": un modulo semplice, funziona senza JavaScript. */
export function SignOutButton({ label }: { label: string }) {
  return (
    <form action={signOut}>
      <Button type="submit" variant="secondary">
        {label}
      </Button>
    </form>
  );
}
