-- Eventi e organizzatori. Le ripetizioni si salvano come regola: le occorrenze le calcola
-- solo event_occurrences() (migrazione delle funzioni).

create table public.events (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  title text not null check (char_length(title) between 1 and 120),
  description text check (char_length(description) <= 500),
  category public.event_category not null,
  price_type public.price_type not null default 'free',
  -- Nessun tetto di prezzo: decisione del fondatore.
  price_amount numeric(8, 2) check (price_amount >= 0),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  recurrence public.recurrence not null default 'none',
  recurrence_until date,
  venue_name text check (char_length(venue_name) <= 120),
  address text not null check (char_length(address) between 1 and 200),
  location extensions.geography(Point, 4326) not null,
  neighborhood_id uuid references public.neighborhoods (id) on delete set null,
  image_path text check (char_length(image_path) <= 200),
  owner_org uuid not null references public.organizations (id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint events_price_amount check ((price_type = 'paid') = (price_amount is not null)),
  constraint events_duration check (ends_at > starts_at and ends_at <= starts_at + interval '24 hours'),
  -- La data di fine si misura in ora di Madrid, come le occorrenze.
  constraint events_recurrence_until check (
    (recurrence = 'none' and recurrence_until is null)
    or (
      recurrence <> 'none'
      and recurrence_until is not null
      and recurrence_until >= (starts_at at time zone 'Europe/Madrid')::date
      and recurrence_until <= ((starts_at at time zone 'Europe/Madrid') + interval '6 months')::date
    )
  )
);

create index events_starts_at_idx on public.events (starts_at);
create index events_owner_org_idx on public.events (owner_org);
create index events_location_idx on public.events using gist (location);

create table public.event_organizers (
  event_id uuid not null references public.events (id) on delete cascade,
  organization_id uuid not null references public.organizations (id) on delete cascade,
  role text not null check (role in ('owner', 'co')),
  created_at timestamptz not null default now(),
  primary key (event_id, organization_id)
);

create unique index event_organizers_one_owner_idx on public.event_organizers (event_id) where role = 'owner';
create index event_organizers_organization_idx on public.event_organizers (organization_id);

create function private.event_owner_org(p_event uuid)
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select e.owner_org from public.events e where e.id = p_event;
$$;

-- Trigger ---------------------------------------------------------------------

create function private.events_before_write()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    new.slug := private.make_unique_slug(new.title, 'events');
    new.neighborhood_id := private.neighborhood_for(new.location);
    return new;
  end if;

  if new.slug is distinct from old.slug or new.owner_org is distinct from old.owner_org then
    raise exception 'event_identity_immutable';
  end if;
  if extensions.st_asbinary(new.location) is distinct from extensions.st_asbinary(old.location) then
    new.neighborhood_id := private.neighborhood_for(new.location);
  end if;
  new.updated_at := now();
  return new;
end;
$$;

create trigger events_before_write
  before insert or update on public.events
  for each row execute function private.events_before_write();

-- security definer: la riga 'owner' non si può inserire con i grant dell'utente,
-- e last_activity_at non è nelle colonne che l'utente può modificare.
create function private.events_after_write()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.event_organizers (event_id, organization_id, role)
    values (new.id, new.owner_org, 'owner');
  end if;

  update public.organizations o
  set last_activity_at = now()
  where o.id in (select eo.organization_id from public.event_organizers eo where eo.event_id = new.id);

  return null;
end;
$$;

create trigger events_after_write
  after insert or update on public.events
  for each row execute function private.events_after_write();

-- RLS events ------------------------------------------------------------------

alter table public.events enable row level security;
revoke all on table public.events from anon, authenticated;
grant select on table public.events to anon, authenticated;
grant insert (
  title, description, category, price_type, price_amount, starts_at, ends_at, recurrence,
  recurrence_until, venue_name, address, location, image_path, owner_org
) on table public.events to authenticated;
grant update (
  title, description, category, price_type, price_amount, starts_at, ends_at, recurrence,
  recurrence_until, venue_name, address, location, image_path
) on table public.events to authenticated;
grant delete on table public.events to authenticated;

-- Archivio compreso: gli eventi passati non sono segreti, escono solo dalla mappa.
-- Gli eventi di un'organizzazione sospesa spariscono dal pubblico; i membri li vedono ancora.
create policy events_select on public.events
  for select to anon, authenticated
  using (private.is_org_active(owner_org) or private.is_org_member(owner_org));

-- Il limite di 20 al giorno lo applica l'action con check_rate_limit: le policy non hanno effetti collaterali.
create policy events_insert_members on public.events
  for insert to authenticated
  with check (private.is_org_member(owner_org) and private.is_org_active(owner_org));

create policy events_update_members on public.events
  for update to authenticated
  using (private.is_org_member(owner_org))
  with check (private.is_org_member(owner_org));

create policy events_delete_members on public.events
  for delete to authenticated
  using (private.is_org_member(owner_org));

-- RLS event_organizers --------------------------------------------------------

alter table public.event_organizers enable row level security;
revoke all on table public.event_organizers from anon, authenticated;
grant select on table public.event_organizers to anon, authenticated;
grant insert (event_id, organization_id, role) on table public.event_organizers to authenticated;
grant delete on table public.event_organizers to authenticated;

-- Visibile se l'evento è visibile (la subquery passa dalla RLS di events).
create policy event_organizers_select on public.event_organizers
  for select to anon, authenticated
  using (exists (select 1 from public.events e where e.id = event_id));

create policy event_organizers_insert_co on public.event_organizers
  for insert to authenticated
  with check (
    role = 'co'
    and private.is_org_member(private.event_owner_org(event_id))
    and private.is_org_active(private.event_owner_org(event_id))
    and private.is_org_active(organization_id)
    and organization_id <> private.event_owner_org(event_id)
  );

-- Il proprietario toglie un co-organizzatore, oppure il co-organizzatore si toglie da solo.
create policy event_organizers_delete_co on public.event_organizers
  for delete to authenticated
  using (
    role = 'co'
    and (
      private.is_org_member(private.event_owner_org(event_id))
      or private.is_org_member(organization_id)
    )
  );
