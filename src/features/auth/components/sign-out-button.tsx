import { Button } from "@/components/ui/button";
import { signOut } from "../actions";

/** "Salir": a plain form, works without JavaScript. */
export function SignOutButton({ label }: { label: string }) {
  return (
    <form action={signOut}>
      <Button type="submit" variant="secondary">
        {label}
      </Button>
    </form>
  );
}
