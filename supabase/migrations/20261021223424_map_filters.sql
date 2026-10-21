-- Sessione 3, revisione del 21 ottobre (docs/decisioni/2026-10-revisione-sezioni.md §1-2).
-- 1. map_items espone il tipo di tutti gli organizzatori di un evento: serve al filtro "Quién organiza".
--    La colonna nuova va in fondo (create or replace view non permette altro); le altre restano identiche.
--    Le righe 'organization' (mappa Conexiones) escono solo se attive: anche un membro, sulla mappa
--    pubblica, non vede il punto della propria organizzazione sospesa.
-- 2. map_neighborhoods: centro e riquadro di ogni barrio in gradi, perché PostgREST non restituisce
--    lng/lat da una colonna geography. Serve al selettore "Barrio" per centrare la mappa.

create or replace view public.map_items
with (security_invoker = true)
as
select
  'event'::text as item_type,
  e.id,
  e.slug,
  e.title as name,
  null::public.org_kind as organization_kind,
  e.category,
  e.price_type,
  e.price_amount,
  o.occ_start,
  o.occ_end,
  e.venue_name,
  e.address,
  extensions.st_x(e.location::extensions.geometry) as lng,
  extensions.st_y(e.location::extensions.geometry) as lat,
  n.slug as neighborhood_slug,
  (
    select string_agg(org.name, ', ' order by (eo.role = 'owner') desc, org.name)
    from public.event_organizers eo
    join public.organizations org on org.id = eo.organization_id
    where eo.event_id = e.id
  ) as organizer_names,
  null::timestamptz as last_activity_at,
  (
    select array_agg(distinct org.kind order by org.kind)
    from public.event_organizers eo
    join public.organizations org on org.id = eo.organization_id
    where eo.event_id = e.id
  ) as organizer_kinds
from public.event_occurrences(now(), now() + interval '7 days') o
join public.events e on e.id = o.event_id
left join public.neighborhoods n on n.id = e.neighborhood_id
where o.occ_end > now()

union all

select
  'organization'::text,
  org.id,
  org.slug,
  org.name,
  org.kind,
  null::public.event_category,
  null::public.price_type,
  null::numeric,
  null::timestamptz,
  null::timestamptz,
  null::text,
  org.address,
  extensions.st_x(org.location::extensions.geometry),
  extensions.st_y(org.location::extensions.geometry),
  n.slug,
  null::text,
  org.last_activity_at,
  null::public.org_kind[]
from public.organizations org
left join public.neighborhoods n on n.id = org.neighborhood_id
where org.location is not null
  and org.kind in ('association', 'venue')
  and org.status = 'active';

create view public.map_neighborhoods
with (security_invoker = true)
as
select
  n.slug,
  n.name,
  n.district,
  extensions.st_x(c.center) as center_lng,
  extensions.st_y(c.center) as center_lat,
  extensions.st_xmin(b.box) as west,
  extensions.st_ymin(b.box) as south,
  extensions.st_xmax(b.box) as east,
  extensions.st_ymax(b.box) as north
from public.neighborhoods n
cross join lateral (
  select coalesce(
    n.centroid::extensions.geometry,
    extensions.st_centroid(n.boundary::extensions.geometry)
  ) as center
) c
cross join lateral (
  select extensions.box3d(n.boundary::extensions.geometry) as box
) b;

revoke all on table public.map_neighborhoods from anon, authenticated;
grant select on table public.map_neighborhoods to anon, authenticated;
