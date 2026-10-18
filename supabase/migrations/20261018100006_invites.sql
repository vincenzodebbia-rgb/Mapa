-- Inviti personali. Solo un'associazione attiva invita; chi usa l'invito entra con entry_method 'invite'.
-- La landing pubblica legge solo tramite get_invite().

create table public.invites (
  id uuid primary key default gen_random_uuid(),
  -- 18 byte casuali in base64 "url-safe" (24 caratteri). encode(..., 'base64url') esiste solo da Postgres 18.
  token text not null unique default translate(encode(extensions.gen_random_bytes(18), 'base64'), '+/', '-_'),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  created_by uuid default auth.uid() references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '30 days',
  used_at timestamptz,
  used_by_org uuid references public.organizations (id) on delete set null
);

create index invites_organization_idx on public.invites (organization_id);
create index invites_created_by_idx on public.invites (created_by);

create function private.invites_before_insert()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if private.org_kind_of(new.organization_id) is distinct from 'association'
     or not private.is_org_active(new.organization_id) then
    raise exception 'invites_only_active_associations';
  end if;
  return new;
end;
$$;

create trigger invites_before_insert
  before insert on public.invites
  for each row execute function private.invites_before_insert();

alter table public.invites enable row level security;
revoke all on table public.invites from anon, authenticated;
grant select on table public.invites to authenticated;
-- Il limite di 20 al giorno lo applica l'action con check_rate_limit prima di inserire.
grant insert (organization_id) on table public.invites to authenticated;

create policy invites_select_members on public.invites
  for select to authenticated
  using (private.is_org_member(organization_id));

create policy invites_insert_members on public.invites
  for insert to authenticated
  with check (private.is_org_member(organization_id) and created_by = (select auth.uid()));
