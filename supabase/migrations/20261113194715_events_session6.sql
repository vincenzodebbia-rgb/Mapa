-- Sessione 6, eventi (docs/decisioni/2026-11-13-eventi.md).
-- D4: niente eventi nel passato, controllato anche qui e non solo nel modulo.
-- D7: niente co-organizzatori in questa sessione, né dall'interfaccia né via API.

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

-- Slug all'inserimento --------------------------------------------------------------

-- Il tipo generato (database.types.ts) chiede slug nell'insert perché la colonna non ha un default; lo riempie il trigger
-- events_before_write, che all'INSERT lo sostituisce SEMPRE con private.make_unique_slug(title). Il grant serve solo a non
-- rifiutare il segnaposto che l'action manda: il valore scritto dall'utente non arriva mai nel database.
-- In update lo slug resta vietato (grant di update senza slug + trigger event_identity_immutable).
grant insert (slug) on table public.events to authenticated;
