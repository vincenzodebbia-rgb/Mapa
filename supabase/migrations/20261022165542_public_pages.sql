-- Sessione 4 (SPEC §5, §7, §14): read model delle pagine pubbliche /a, /e e /barrio.
-- Tutto security_invoker / security invoker: passa dalla RLS (niente enti sospesi né loro eventi per il pubblico).
-- Le ripetizioni restano calcolate solo da event_occurrences().

-- upcoming_events ---------------------------------------------------------------
-- Occorrenze non finite nei prossimi 60 giorni (map_items copre solo 7 giorni: basta alla mappa, non alle pagine).
-- organizer_ids serve a filtrare per organizzazione (scheda), neighborhood_slug per barrio.
create view public.upcoming_events
with (security_invoker = true)
as
select
  e.id,
  e.slug,
  e.title,
  e.category,
  e.price_type,
  e.price_amount,
  o.occ_start,
  o.occ_end,
  e.venue_name,
  e.address,
  n.slug as neighborhood_slug,
  n.name as neighborhood_name,
  organizers.organizer_ids,
  organizers.organizer_names
from public.event_occurrences(now(), now() + interval '60 days') o
join public.events e on e.id = o.event_id
left join public.neighborhoods n on n.id = e.neighborhood_id
cross join lateral (
  select
    array_agg(org.id order by (eo.role = 'owner') desc, org.name) as organizer_ids,
    string_agg(org.name, ', ' order by (eo.role = 'owner') desc, org.name) as organizer_names
  from public.event_organizers eo
  join public.organizations org on org.id = eo.organization_id
  where eo.event_id = e.id
) organizers
where o.occ_end > now();

revoke all on table public.upcoming_events from anon, authenticated;
grant select on table public.upcoming_events to anon, authenticated;

-- event_schedule ----------------------------------------------------------------
-- Prossima occorrenza e fine dell'ultima, per la pagina evento e il suo redirect 7 giorni dopo la fine.
-- event_occurrences espande tutti gli eventi (max 28 occorrenze ciascuno) e poi si filtra: va bene finché il
-- database è piccolo; se diventa lento si aggiunge un parametro p_event_id a event_occurrences.
create function public.event_schedule(p_event_id uuid)
returns table (next_start timestamptz, next_end timestamptz, last_end timestamptz)
language sql
stable
security invoker
set search_path = ''
as $$
  select
    min(o.occ_start) filter (where o.occ_end > now()),
    (array_agg(o.occ_end order by o.occ_start) filter (where o.occ_end > now()))[1],
    max(o.occ_end)
  from public.event_occurrences('-infinity', 'infinity') o
  where o.event_id = p_event_id;
$$;

revoke execute on function public.event_schedule(uuid) from public, anon, authenticated;
grant execute on function public.event_schedule(uuid) to anon, authenticated;

-- neighborhood_pages --------------------------------------------------------------
-- Un barrio ha contenuto (indicizzabile, in sitemap) se ci sono un'associazione o un espacio attivi
-- o almeno un evento non ancora finito. Le occorrenze si espandono una sola volta (CTE), non per barrio.
create view public.neighborhood_pages
with (security_invoker = true)
as
with future_event_neighborhoods as (
  select distinct e.neighborhood_id
  from public.event_occurrences(now(), 'infinity') o
  join public.events e on e.id = o.event_id
  where e.neighborhood_id is not null
)
select
  n.slug,
  n.name,
  n.district,
  (
    exists (
      select 1 from public.organizations org
      where org.neighborhood_id = n.id
        and org.kind in ('association', 'venue')
        and org.status = 'active'
    )
    or exists (select 1 from future_event_neighborhoods f where f.neighborhood_id = n.id)
  ) as has_content
from public.neighborhoods n;

revoke all on table public.neighborhood_pages from anon, authenticated;
grant select on table public.neighborhood_pages to anon, authenticated;

-- neighborhood_neighbors ----------------------------------------------------------
-- Barrios confinanti, per i link "barrios vicinos". 5 metri di tolleranza: i confini ufficiali possono avere
-- fessure minime tra un barrio e l'altro. Usa l'indice GIST su boundary.
create view public.neighborhood_neighbors
with (security_invoker = true)
as
select
  n.slug,
  other.slug as neighbor_slug,
  other.name as neighbor_name
from public.neighborhoods n
join public.neighborhoods other
  on other.id <> n.id
 and extensions.st_dwithin(other.boundary, n.boundary, 5);

revoke all on table public.neighborhood_neighbors from anon, authenticated;
grant select on table public.neighborhood_neighbors to anon, authenticated;
