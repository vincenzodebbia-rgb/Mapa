/** A short status message over the map or above the list (empty days, no results). Never fake content. */
export function MapNotice({ message }: { message: string }) {
  return (
    <p role="status" className="rounded-card border border-line bg-night/90 p-3 text-sm">
      {message}
    </p>
  );
}
