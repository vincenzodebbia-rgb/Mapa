-- Sessione 4 (SPEC §7): logo piccolo facoltativo e "Nuestra historia" nella scheda pubblica.
-- Il caricamento del logo arriva con "Mi ficha" (sessione 7): qui solo colonne, bucket e policy.
-- export_my_data() usa to_jsonb(o): include già le colonne nuove.

alter table public.organizations
  add column logo_path text,
  add column story text check (char_length(story) <= 1000),
  -- Un solo logo per organizzazione, sempre nella sua cartella: nessuno punta al file di un altro.
  add constraint organizations_logo_path check (logo_path is null or logo_path = id::text || '/logo.webp');

-- La select di organizations è concessa per colonna: le colonne nuove vanno aggiunte.
grant select (logo_path, story) on table public.organizations to anon, authenticated;
grant update (logo_path, story) on table public.organizations to authenticated;

-- Stessa funzione del trigger, con logo e storia tra i cambi che contano come "attività".
create or replace function private.organizations_before_write()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    new.slug := private.make_unique_slug(new.name, 'organizations');
    new.neighborhood_id := private.neighborhood_for(new.location);
    return new;
  end if;

  if new.slug is distinct from old.slug then
    raise exception 'slug_immutable';
  end if;

  -- Confronto in binario: l'uguaglianza di geography non è affidabile per questo scopo.
  if extensions.st_asbinary(new.location) is distinct from extensions.st_asbinary(old.location) then
    new.neighborhood_id := private.neighborhood_for(new.location);
  end if;

  -- "Attività" = aggiornare la scheda. I cambi di stato fatti dagli admin non contano.
  if (new.name, new.one_liner, new.when_to_visit, new.contact_email, new.contact_phone, new.contact_url,
      new.address, extensions.st_asbinary(new.location), new.usual_category, new.seeking_offering,
      new.indexable, new.venue_activity, new.logo_path, new.story)
     is distinct from
     (old.name, old.one_liner, old.when_to_visit, old.contact_email, old.contact_phone, old.contact_url,
      old.address, extensions.st_asbinary(old.location), old.usual_category, old.seeking_offering,
      old.indexable, old.venue_activity, old.logo_path, old.story) then
    new.last_activity_at := now();
  end if;

  -- Passare a un'attività dubbia senza essere entrati con invito riaccende l'avviso.
  -- Non lo spegne mai: lo fa solo mark_reviewed(), così non si sfugge alla revisione cambiando attività.
  if new.venue_activity is distinct from old.venue_activity
     and new.entry_method <> 'invite'
     and public.is_doubtful_activity(new.venue_activity) then
    new.flagged_for_review := true;
  end if;

  new.updated_at := now();
  return new;
end;
$$;

-- Bucket dei loghi: lettura pubblica, solo WebP già ri-codificato dall'action (max 256×256, senza metadati).
-- Path "{organization_id}/logo.webp": stessa regola di event-images, quindi stessa funzione.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('org-logos', 'org-logos', true, 524288, array['image/webp'])
on conflict (id) do nothing;

-- Serve anche select: l'upload con upsert legge l'oggetto esistente.
create policy org_logos_select_members on storage.objects
  for select to authenticated
  using (bucket_id = 'org-logos' and private.can_write_event_image(name, false));

create policy org_logos_insert_members on storage.objects
  for insert to authenticated
  with check (bucket_id = 'org-logos' and private.can_write_event_image(name, true));

create policy org_logos_update_members on storage.objects
  for update to authenticated
  using (bucket_id = 'org-logos' and private.can_write_event_image(name, true))
  with check (bucket_id = 'org-logos' and private.can_write_event_image(name, true));

-- Cancellare si può anche da sospesi: serve per eliminare l'account.
create policy org_logos_delete_members on storage.objects
  for delete to authenticated
  using (bucket_id = 'org-logos' and private.can_write_event_image(name, false));
