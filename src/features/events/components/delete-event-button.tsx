"use client";

import { Button } from "@/components/ui/button";
import { deleteEvent } from "../actions";

type DeleteEventButtonProps = { eventId: string; label: string; confirmText: string };

/** "Eliminar" con una conferma del browser: cancellare un evento non si può annullare. */
export function DeleteEventButton({ eventId, label, confirmText }: DeleteEventButtonProps) {
  return (
    <form
      action={deleteEvent}
      onSubmit={(event) => {
        if (!window.confirm(confirmText)) event.preventDefault();
      }}
    >
      <input type="hidden" name="eventId" value={eventId} />
      <Button type="submit" variant="secondary">
        {label}
      </Button>
    </form>
  );
}
