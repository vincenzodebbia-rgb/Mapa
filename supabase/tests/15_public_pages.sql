-- Test 15 (sessione 4): read model delle pagine pubbliche. upcoming_events nasconde gli enti sospesi e
-- filtra per organizzatore; event_schedule dà prossima occorrenza e fine dell'ultima; neighborhood_pages
-- dice se un barrio ha contenuto (noindex se no); neighborhood_neighbors trova i confinanti.
begin;
create extension if not exists pgtap with schema extensions;
set local search_path = extensions, public;
select no_plan();

-- Tre barrios di prova lontani da Madrid (nessuna sovrapposizione con quelli veri): P e Q confinanti, R isolato.
insert into public.neighborhoods (slug, name, district, boundary) values
  ('prueba-p-quince', 'Prueba P', 'Distrito quince', 'SRID=4326;MULTIPOLYGON(((-1.10 41.00, -1.00 41.00, -1.00 41.10, -1.10 41.10, -1.10 41.00)))'),
  ('prueba-q-quince', 'Prueba Q', 'Distrito quince', 'SRID=4326;MULTIPOLYGON(((-1.00 41.00, -0.90 41.00, -0.90 41.10, -1.00 41.10, -1.00 41.00)))'),
  ('prueba-r-quince', 'Prueba R', 'Distrito quince', 'SRID=4326;MULTIPOLYGON(((-0.50 41.50, -0.40 41.50, -0.40 41.60, -0.50 41.60, -0.50 41.50)))');

insert into public.organizations (id, kind, name, entry_method, location) values
  ('a0000000-0000-4000-8000-000000000015', 'association', 'Activa quince', 'self_declared', 'SRID=4326;POINT(-1.05 41.05)'),
  ('d0000000-0000-4000-8000-000000000015', 'association', 'Suspendida quince', 'self_declared', 'SRID=4326;POINT(-0.95 41.05)');

insert into public.events (id, title, category, starts_at, ends_at, recurrence, recurrence_until, address, location, owner_org) values
  -- Settimanale da 3 settimane fa per 5 settimane: prossima occorrenza tra ~4 giorni, ultima tra ~11.
  ('e1000000-0000-4000-8000-000000000015', 'Semanal quince', 'musica',
   now() - interval '21 days' + interval '4 days', now() - interval '21 days' + interval '4 days 2 hours',
   'weekly', ((now() + interval '13 days') at time zone 'Europe/Madrid')::date,
   'Calle', 'SRID=4326;POINT(-1.05 41.05)', 'a0000000-0000-4000-8000-000000000015'),
  ('e2000000-0000-4000-8000-000000000015', 'De la suspendida quince', 'arte',
   now() + interval '2 days', now() + interval '2 days 2 hours', 'none', null,
   'Calle', 'SRID=4326;POINT(-0.95 41.05)', 'd0000000-0000-4000-8000-000000000015'),
  ('e3000000-0000-4000-8000-000000000015', 'Pasado quince', 'arte',
   now() - interval '10 days', now() - interval '10 days' + interval '2 hours', 'none', null,
   'Calle', 'SRID=4326;POINT(-1.05 41.05)', 'a0000000-0000-4000-8000-000000000015');

update public.organizations set status = 'suspended' where id = 'd0000000-0000-4000-8000-000000000015';

select ok(
  (select bool_and(reloptions @> array['security_invoker=true']) from pg_class
   where oid in ('public.upcoming_events'::regclass, 'public.neighborhood_pages'::regclass,
                 'public.neighborhood_neighbors'::regclass)),
  'le viste nuove sono security_invoker'
);

set local request.jwt.claims to '{"role":"anon"}';
set local role anon;

select results_eq(
  $$ select count(*)::int from public.upcoming_events where id = 'e1000000-0000-4000-8000-000000000015' $$,
  $$ values (2) $$,
  'anon: le due occorrenze future del settimanale (le passate no)'
);
select results_eq(
  $$ select neighborhood_slug, organizer_names from public.upcoming_events
     where organizer_ids @> array['a0000000-0000-4000-8000-000000000015'::uuid] limit 1 $$,
  $$ values ('prueba-p-quince', 'Activa quince') $$,
  'anon: filtro per organizzatore, con barrio e nomi'
);
select is_empty(
  $$ select 1 from public.upcoming_events where id in ('e2000000-0000-4000-8000-000000000015', 'e3000000-0000-4000-8000-000000000015') $$,
  'anon: niente eventi di enti sospesi né eventi finiti'
);

select ok(
  (select next_start > now() and next_start < now() + interval '5 days'
          and last_end > now() + interval '10 days' and last_end < now() + interval '13 days'
   from public.event_schedule('e1000000-0000-4000-8000-000000000015')),
  'event_schedule: prossima occorrenza e fine dell''ultima del settimanale'
);
select ok(
  (select next_start is null and last_end < now() from public.event_schedule('e3000000-0000-4000-8000-000000000015')),
  'event_schedule: un evento finito non ha prossima occorrenza'
);
select ok(
  (select next_start is null and last_end is null from public.event_schedule('e2000000-0000-4000-8000-000000000015')),
  'event_schedule: un evento di un ente sospeso è invisibile'
);

select results_eq(
  $$ select slug, has_content from public.neighborhood_pages where slug like 'prueba-%-quince' order by slug $$,
  $$ values ('prueba-p-quince', true), ('prueba-q-quince', false), ('prueba-r-quince', false) $$,
  'anon: P ha contenuto; Q ha solo un ente sospeso e il suo evento; R è vuoto'
);
select results_eq(
  $$ select neighbor_slug from public.neighborhood_neighbors where slug = 'prueba-p-quince' $$,
  $$ values ('prueba-q-quince') $$,
  'anon: P confina con Q e non con R'
);

select * from finish();
rollback;
