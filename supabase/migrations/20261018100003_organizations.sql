-- Organizzazioni (scheda pubblica), membership, verifiche con NIF, elenco del Comune,
-- risposte dell'iscrizione e accettazioni dei testi legali.

-- organizations ---------------------------------------------------------------

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  kind public.org_kind not null,
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name text not null check (char_length(name) between 1 and 120),
  one_liner text check (char_length(one_liner) <= 120),
  when_to_visit text check (char_length(when_to_visit) <= 120),
  contact_email text check (char_length(contact_email) <= 254),
  contact_phone text check (char_length(contact_phone) <= 30),
  contact_url text check (char_length(contact_url) <= 500 and contact_url ~* '^https?://[^\s]+$'),
  address text check (char_length(address) <= 200),
  location extensions.geography(Point, 4326),
  neighborhood_id uuid references public.neighborhoods (id) on delete set null,
  usual_category public.event_category,
  seeking_offering text check (char_length(seeking_offering) <= 200),
  indexable boolean not null default true,
  verified boolean not null default false,
  entry_method public.entry_method not null,
  venue_activity public.venue_activity,
  status public.org_status not null default 'active',
  flagged_for_review boolean not null default false,
  last_reviewed_at timestamptz,
  last_activity_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- I professionisti non hanno mai un punto proprio sulla mappa.
  constraint organizations_professional_no_location check (kind <> 'professional' or location is null),
  constraint organizations_venue_activity check ((kind = 'venue') = (venue_activity is not null)),
  -- Solo i professionisti possono chiedere di non comparire su Google.
  constraint organizations_indexable check (kind = 'professional' or indexable)
);

create index organizations_location_idx on public.organizations using gist (location);
create index organizations_neighborhood_idx on public.organizations (neighborhood_id);

-- memberships -----------------------------------------------------------------

create table public.memberships (
  user_id uuid not null references auth.users (id) on delete cascade,
  organization_id uuid not null references public.organizations (id) on delete cascade,
  role text not null default 'owner' check (role = 'owner'),
  created_at timestamptz not null default now(),
  primary key (user_id, organization_id),
  -- v1: un utente gestisce una sola organizzazione.
  constraint memberships_one_org_per_user unique (user_id)
);

create index memberships_organization_idx on public.memberships (organization_id);

-- Helper per le policy. security definer: leggono memberships/organizations senza passare
-- dalla loro RLS (evita ricorsioni e fa vedere lo stato anche di enti nascosti).

create function private.is_org_member(p_org uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.memberships m
    where m.organization_id = p_org and m.user_id = (select auth.uid())
  );
$$;

create function private.is_org_active(p_org uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.organizations o
    where o.id = p_org and o.status = 'active'
  );
$$;

create function private.org_kind_of(p_org uuid)
returns public.org_kind
language sql
stable
security definer
set search_path = ''
as $$
  select o.kind from public.organizations o where o.id = p_org;
$$;

-- Trigger di organizations ----------------------------------------------------

create function private.organizations_before_write()
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
      new.indexable, new.venue_activity)
     is distinct from
     (old.name, old.one_liner, old.when_to_visit, old.contact_email, old.contact_phone, old.contact_url,
      old.address, extensions.st_asbinary(old.location), old.usual_category, old.seeking_offering,
      old.indexable, old.venue_activity) then
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

create trigger organizations_before_write
  before insert or update on public.organizations
  for each row execute function private.organizations_before_write();

-- RLS organizations -----------------------------------------------------------

alter table public.organizations enable row level security;
revoke all on table public.organizations from anon, authenticated;

-- entry_method, flagged_for_review e last_reviewed_at non sono pubblici: li vede solo la revisione.
grant select (
  id, kind, slug, name, one_liner, when_to_visit, contact_email, contact_phone, contact_url, address,
  location, neighborhood_id, usual_category, seeking_offering, indexable, verified, venue_activity,
  status, last_activity_at, created_at, updated_at
) on table public.organizations to anon, authenticated;

grant update (
  name, one_liner, when_to_visit, contact_email, contact_phone, contact_url, address, location,
  usual_category, seeking_offering, indexable, venue_activity
) on table public.organizations to authenticated;

-- Il pubblico vede solo le attive; i membri vedono sempre la propria (anche sospesa:
-- devono poter leggere la motivazione e scaricare i dati).
create policy organizations_select on public.organizations
  for select to anon, authenticated
  using (status = 'active' or private.is_org_member(id));

create policy organizations_update_members on public.organizations
  for update to authenticated
  using (private.is_org_member(id))
  with check (private.is_org_member(id));

-- RLS memberships -------------------------------------------------------------

alter table public.memberships enable row level security;
revoke all on table public.memberships from anon, authenticated;
grant select on table public.memberships to authenticated;

create policy memberships_select_own on public.memberships
  for select to authenticated
  using (user_id = (select auth.uid()));

-- organization_verifications (privata) ----------------------------------------

create table public.organization_verifications (
  organization_id uuid primary key references public.organizations (id) on delete cascade,
  nif text not null unique check (nif = private.normalize_nif(nif) and private.is_entity_nif(nif)),
  verified_at timestamptz not null default now()
);

alter table public.organization_verifications enable row level security;
revoke all on table public.organization_verifications from anon, authenticated;

-- municipal_associations (privata) --------------------------------------------

create table public.municipal_associations (
  cif text primary key check (cif = private.normalize_nif(cif) and private.is_entity_nif(cif)),
  name text not null check (char_length(name) between 1 and 300),
  registry_number text,
  district text,
  neighborhood text,
  category text,
  imported_at timestamptz not null default now()
);

alter table public.municipal_associations enable row level security;
revoke all on table public.municipal_associations from anon, authenticated;

-- organization_answers (privata ai membri) ------------------------------------

create table public.organization_answers (
  organization_id uuid primary key references public.organizations (id) on delete cascade,
  what_for_whom text check (char_length(what_for_whom) <= 500),
  how_sustained text check (char_length(how_sustained) <= 500),
  updated_at timestamptz not null default now()
);

create trigger organization_answers_updated_at
  before update on public.organization_answers
  for each row execute function private.set_updated_at();

alter table public.organization_answers enable row level security;
revoke all on table public.organization_answers from anon, authenticated;
grant select (organization_id, what_for_whom, how_sustained, updated_at)
  on table public.organization_answers to authenticated;
grant update (what_for_whom, how_sustained) on table public.organization_answers to authenticated;

create policy organization_answers_select_members on public.organization_answers
  for select to authenticated
  using (private.is_org_member(organization_id));

create policy organization_answers_update_members on public.organization_answers
  for update to authenticated
  using (private.is_org_member(organization_id))
  with check (private.is_org_member(organization_id));

-- terms_acceptances (privata all'utente) --------------------------------------

create table public.terms_acceptances (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  terms_version text not null check (char_length(terms_version) between 1 and 40),
  privacy_version text not null check (char_length(privacy_version) between 1 and 40),
  age_confirmed boolean not null check (age_confirmed),
  accepted_at timestamptz not null default now()
);

create index terms_acceptances_user_idx on public.terms_acceptances (user_id);

alter table public.terms_acceptances enable row level security;
revoke all on table public.terms_acceptances from anon, authenticated;
grant select on table public.terms_acceptances to authenticated;

create policy terms_acceptances_select_own on public.terms_acceptances
  for select to authenticated
  using (user_id = (select auth.uid()));
