-- Read model della mappa. security_invoker: le viste ereditano la RLS delle tabelle,
-- quindi niente fili pending per estranei e niente contenuti di organizzazioni sospese, senza codice in più.

create view public.map_items
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
  null::timestamptz as last_activity_at
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
  org.last_activity_at
from public.organizations org
left join public.neighborhoods n on n.id = org.neighborhood_id
where org.location is not null
  and org.kind in ('association', 'venue');

create view public.connection_lines
with (security_invoker = true)
as
select
  t.id,
  t.color_seed,
  p.slug as proposer_slug,
  p.name as proposer_name,
  extensions.st_x(p.location::extensions.geometry) as proposer_lng,
  extensions.st_y(p.location::extensions.geometry) as proposer_lat,
  r.slug as receiver_slug,
  r.name as receiver_name,
  extensions.st_x(r.location::extensions.geometry) as receiver_lng,
  extensions.st_y(r.location::extensions.geometry) as receiver_lat,
  t.story_proposer,
  t.story_receiver,
  t.confirmed_at
from public.threads t
join public.organizations p on p.id = t.proposer_org
join public.organizations r on r.id = t.receiver_org
where t.status = 'confirmed'
  and p.location is not null
  and r.location is not null;

revoke all on table public.map_items, public.connection_lines from anon, authenticated;
grant select on table public.map_items, public.connection_lines to anon, authenticated;
