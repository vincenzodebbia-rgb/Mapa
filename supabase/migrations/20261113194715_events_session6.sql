-- Sessione 6, eventi (docs/decisioni/2026-11-13-eventi.md).
-- D4: niente eventi nel passato, controllato anche qui e non solo nel modulo.
-- D7: niente co-organizzatori in questa sessione, né dall'interfaccia né via API.
-- A: fine diversa dall'inizio. Slug con un valore predefinito. Nessun caricamento nel bucket event-images.

-- D4: eventi nel passato ------------------------------------------------------------

-- Regola unica (anche in src/features/events/schema.ts): un evento non si crea se è già finito (ends_at <= now()).
-- Un evento in corso si può ancora pubblicare (per esempio 22:00–04:00 pubblicato all'01:00).
-- In modifica la regola vale solo se cambiano gli orari o la ripetizione, così la descrizione di un evento passato
-- resta modificabile. Per una serie che si ripete conta la data di fine della serie, non la prima occorrenza.
-- Senza utente (seed, migrazioni, server con service_role) non si controlla: la seed ha un evento passato per l'archivio.
create function private.events_not_in_past()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if auth.uid() is null then
    return new;
  end if;

  if tg_op = 'UPDATE'
     and (new.starts_at, new.ends_at, new.recurrence, new.recurrence_until)
         is not distinct from (old.starts_at, old.ends_at, old.recurrence, old.recurrence_until) then
    return new;
  end if;

  if tg_op = 'UPDATE' and new.recurrence <> 'none' then
    if new.recurrence_until < (now() at time zone 'Europe/Madrid')::date then
      raise exception 'event_in_past';
    end if;
  elsif new.ends_at <= now() then
    raise exception 'event_in_past';
  end if;

  return new;
end;
$$;

revoke execute on function private.events_not_in_past() from public, anon, authenticated;

-- Il nome viene prima di events_rate_limit (i trigger before girano in ordine alfabetico): un evento rifiutato qui non
-- arriva nemmeno al contatore.
create trigger events_not_in_past
  before insert or update on public.events
  for each row execute function private.events_not_in_past();

-- D7: niente co-organizzatori ----------------------------------------------------------

-- La riga 'owner' la scrive sempre il trigger events_after_write (security definer), quindi agli utenti l'insert non
-- serve più. Le righe 'co' già esistenti (seed) restano e si possono ancora togliere (policy event_organizers_delete_co).
drop policy event_organizers_insert_co on public.event_organizers;
revoke insert on table public.event_organizers from authenticated;

comment on table public.event_organizers is
  'Organizzatori di un evento. Dal 13 novembre 2026 nessun utente aggiunge co-organizzatori (decisione D7): '
  'la riga owner la scrive il trigger events_after_write.';

-- A: ora di fine diversa da quella di inizio ---------------------------------------------

-- Decisione A del 13 novembre: "La hora de fin debe ser distinta de la de inicio" (anche nel modulo, schema.ts).
-- Fine prima dell'inizio resta il giorno dopo (al massimo 24 ore, events_duration): qui si confrontano le ore di Madrid.
-- not valid: vale per ogni insert e update da adesso, senza bloccare la migrazione per righe vecchie di prova.
alter table public.events
  add constraint events_end_differs_from_start
  check ((ends_at at time zone 'Europe/Madrid')::time <> (starts_at at time zone 'Europe/Madrid')::time)
  not valid;

-- Slug: valore predefinito, nessun permesso agli utenti -----------------------------------

-- Lo scrive SEMPRE il trigger events_before_write (private.make_unique_slug(title)) e non cambia mai.
-- Il valore predefinito serve solo al tipo generato (database.types.ts): con un default l'insert non lo richiede più.
-- Stringa vuota di proposito: se il trigger mancasse, il vincolo sul formato dello slug rifiuterebbe la riga.
-- Gli utenti non hanno nessun permesso su slug (né insert né update).
alter table public.events alter column slug set default '';

-- Immagini degli eventi: nessun caricamento ------------------------------------------------

-- Decisione del 21 ottobre: niente foto degli eventi. Le policy della sessione 2 permettevano a ogni membro di caricare
-- e riscrivere file in event-images direttamente via API Storage: si tolgono. Restano select e delete (il bucket è vuoto;
-- delete serve a eliminare l'account se un file ci fosse). La funzione can_write_event_image resta: la usano i loghi.
drop policy event_images_insert_members on storage.objects;
drop policy event_images_update_members on storage.objects;

-- La colonna image_path non è usata da nessun codice: gli utenti non la scrivono più (si toglierà con D1).
revoke insert (image_path), update (image_path) on table public.events from authenticated;
