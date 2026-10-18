-- Spazi disponibili in affitto o prestito. Li pubblicano associazioni ed espacios (venue),
-- mai i professionisti. Visibili solo agli utenti registrati.

create table public.spaces (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  space_type public.space_type not null,
  neighborhood_id uuid references public.neighborhoods (id) on delete set null,
  price_type public.price_type not null check (price_type in ('free', 'paid')),
  description text check (char_length(description) <= 300),
  contact text check (char_length(contact) <= 200),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index spaces_organization_idx on public.spaces (organization_id);

create function private.spaces_before_write()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if coalesce(private.org_kind_of(new.organization_id) in ('association', 'venue'), false) is false then
    raise exception 'spaces_only_associations_and_venues';
  end if;
  if tg_op = 'UPDATE' then
    new.updated_at := now();
  end if;
  return new;
end;
$$;

create trigger spaces_before_write
  before insert or update on public.spaces
  for each row execute function private.spaces_before_write();

alter table public.spaces enable row level security;
revoke all on table public.spaces from anon, authenticated;
grant select on table public.spaces to authenticated;
grant insert (organization_id, space_type, neighborhood_id, price_type, description, contact)
  on table public.spaces to authenticated;
grant update (space_type, neighborhood_id, price_type, description, contact)
  on table public.spaces to authenticated;
grant delete on table public.spaces to authenticated;

create policy spaces_select on public.spaces
  for select to authenticated
  using (private.is_org_active(organization_id) or private.is_org_member(organization_id));

create policy spaces_insert_members on public.spaces
  for insert to authenticated
  with check (private.is_org_member(organization_id) and private.is_org_active(organization_id));

create policy spaces_update_members on public.spaces
  for update to authenticated
  using (private.is_org_member(organization_id))
  with check (private.is_org_member(organization_id));

create policy spaces_delete_members on public.spaces
  for delete to authenticated
  using (private.is_org_member(organization_id));
