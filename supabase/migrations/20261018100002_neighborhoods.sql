-- Barrios ufficiali di Madrid (open data del Comune). Lettura pubblica.
-- Li riempie scripts/import-neighborhoods.ts; la seed contiene solo rettangoli segnaposto.

create table public.neighborhoods (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name text not null check (char_length(name) between 1 and 120),
  district text check (char_length(district) <= 120),
  boundary extensions.geography(MultiPolygon, 4326) not null,
  centroid extensions.geography(Point, 4326),
  created_at timestamptz not null default now()
);

create index neighborhoods_boundary_idx on public.neighborhoods using gist (boundary);

alter table public.neighborhoods enable row level security;
revoke all on table public.neighborhoods from anon, authenticated;
grant select on table public.neighborhoods to anon, authenticated;

create policy neighborhoods_select_public on public.neighborhoods
  for select to anon, authenticated
  using (true);

-- Barrio di un punto: usato dai trigger di organizations ed events.
create function private.neighborhood_for(p_location extensions.geography)
returns uuid
language sql
stable
set search_path = ''
as $$
  select n.id
  from public.neighborhoods n
  where p_location is not null
    and extensions.st_covers(n.boundary, p_location)
  order by n.slug
  limit 1;
$$;
