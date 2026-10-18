-- Bucket delle immagini degli eventi: lettura pubblica, scrittura solo per i membri dell'organizzazione
-- indicata dalla prima cartella del path "{organization_id}/{event_id}.webp".
-- Le immagini arrivano solo dall'action, già ri-codificate in WebP senza metadati.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('event-images', 'event-images', true, 5242880, array['image/webp'])
on conflict (id) do nothing;

-- Un path che non inizia con un uuid non è di nessuno: si rifiuta senza tentare il cast.
create function private.can_write_event_image(p_name text, p_require_active boolean)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_folder text := (storage.foldername(p_name))[1];
begin
  if v_folder is null
     or v_folder !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    return false;
  end if;
  return private.is_org_member(v_folder::uuid)
    and (not p_require_active or private.is_org_active(v_folder::uuid));
end;
$$;

-- Serve anche select: l'upload con upsert legge l'oggetto esistente.
create policy event_images_select_members on storage.objects
  for select to authenticated
  using (bucket_id = 'event-images' and private.can_write_event_image(name, false));

create policy event_images_insert_members on storage.objects
  for insert to authenticated
  with check (bucket_id = 'event-images' and private.can_write_event_image(name, true));

create policy event_images_update_members on storage.objects
  for update to authenticated
  using (bucket_id = 'event-images' and private.can_write_event_image(name, true))
  with check (bucket_id = 'event-images' and private.can_write_event_image(name, true));

-- Cancellare si può anche da sospesi: serve per eliminare l'account.
create policy event_images_delete_members on storage.objects
  for delete to authenticated
  using (bucket_id = 'event-images' and private.can_write_event_image(name, false));
