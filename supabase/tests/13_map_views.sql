-- Test 13 (sessione 3): map_items espone il tipo degli organizzatori ("Quién organiza") e mostra come punti
-- solo associazioni ed espacios attivi con un indirizzo (mappa Conexiones); map_neighborhoods dà centro e
-- riquadro dei barrios in gradi, leggibili da anon.
begin;
create extension if not exists pgtap with schema extensions;
set local search_path = extensions, public;
select no_plan();

insert into auth.users (id, email) values
  ('0000000a-0000-4000-8000-000000000013', 'a13@test.invalid'),
  ('0000000c-0000-4000-8000-000000000013', 's13@test.invalid');
insert into public.organizations (id, kind, name, entry_method, location, venue_activity) values
  ('a0000000-0000-4000-8000-000000000013', 'association', 'Asociación trece', 'self_declared', 'SRID=4326;POINT(-3.70 40.41)', null),
  ('b0000000-0000-4000-8000-000000000013', 'venue', 'Espacio trece', 'self_declared', 'SRID=4326;POINT(-3.71 40.42)', 'libreria'),
  ('c0000000-0000-4000-8000-000000000013', 'professional', 'Gente trece', 'email_only', null, null),
  ('d0000000-0000-4000-8000-000000000013', 'association', 'Suspendida trece', 'self_declared', 'SRID=4326;POINT(-3.72 40.43)', null),
  ('e0000000-0000-4000-8000-000000000013', 'association', 'Sin dirección trece', 'self_declared', null, null);
insert into public.memberships (user_id, organization_id) values
  ('0000000a-0000-4000-8000-000000000013', 'a0000000-0000-4000-8000-000000000013'),
  ('0000000c-0000-4000-8000-000000000013', 'd0000000-0000-4000-8000-000000000013');
insert into public.events (id, title, category, starts_at, ends_at, address, location, owner_org) values
  ('e1000000-0000-4000-8000-000000000013', 'De gente con asociación', 'musica', now() + interval '1 day',
   now() + interval '1 day 2 hours', 'Calle', 'SRID=4326;POINT(-3.70 40.41)', 'c0000000-0000-4000-8000-000000000013'),
  ('e2000000-0000-4000-8000-000000000013', 'De un espacio', 'arte', now() + interval '2 days',
   now() + interval '2 days 2 hours', 'Calle', 'SRID=4326;POINT(-3.71 40.42)', 'b0000000-0000-4000-8000-000000000013');
insert into public.event_organizers (event_id, organization_id, role) values
  ('e1000000-0000-4000-8000-000000000013', 'a0000000-0000-4000-8000-000000000013', 'co');
insert into public.neighborhoods (slug, name, district, boundary) values
  ('barrio-de-prueba-trece', 'Barrio de prueba', 'Distrito de prueba',
   'SRID=4326;MULTIPOLYGON(((-3.80 40.30, -3.78 40.30, -3.78 40.32, -3.80 40.32, -3.80 40.30)))');

update public.organizations set status = 'suspended' where id = 'd0000000-0000-4000-8000-000000000013';

select has_column('public', 'map_items', 'organizer_kinds', 'map_items ha organizer_kinds');
select ok(
  (select reloptions @> array['security_invoker=true'] from pg_class where oid = 'public.map_neighborhoods'::regclass),
  'map_neighborhoods è security_invoker'
);
select ok(
  (select reloptions @> array['security_invoker=true'] from pg_class where oid = 'public.map_items'::regclass),
  'map_items resta security_invoker'
);

-- anon -----------------------------------------------------------------------
set local request.jwt.claims to '{"role":"anon"}';
set local role anon;
select results_eq(
  $$ select organizer_kinds::text[] from public.map_items where id = 'e1000000-0000-4000-8000-000000000013' $$,
  $$ values (array['association', 'professional']) $$,
  'anon: un evento ha i tipi di tutti i suoi organizzatori'
);
select results_eq(
  $$ select organizer_kinds::text[] from public.map_items where id = 'e2000000-0000-4000-8000-000000000013' $$,
  $$ values (array['venue']) $$,
  'anon: evento di un espacio'
);
select results_eq(
  $$ select name from public.map_items
     where item_type = 'organization' and name like '%trece' order by name $$,
  $$ values ('Asociación trece'), ('Espacio trece') $$,
  'anon: come punti solo associazioni ed espacios attivi con indirizzo'
);
select is_empty(
  $$ select 1 from public.map_items where item_type = 'organization' and organizer_kinds is not null $$,
  'anon: le righe organization non hanno organizer_kinds'
);
select results_eq(
  $$ select round(center_lng::numeric, 6), round(center_lat::numeric, 6),
            round(west::numeric, 6), round(south::numeric, 6), round(east::numeric, 6), round(north::numeric, 6)
     from public.map_neighborhoods where slug = 'barrio-de-prueba-trece' $$,
  $$ values (-3.79::numeric, 40.31::numeric, -3.80::numeric, 40.30::numeric, -3.78::numeric, 40.32::numeric) $$,
  'anon: centro (calcolato dal confine se manca) e riquadro del barrio'
);

-- membro dell'organizzazione sospesa ------------------------------------------
reset role;
set local request.jwt.claims to '{"sub":"0000000c-0000-4000-8000-000000000013","role":"authenticated"}';
set local role authenticated;
select isnt_empty(
  $$ select 1 from public.organizations where id = 'd0000000-0000-4000-8000-000000000013' $$,
  'il membro vede ancora la propria scheda sospesa'
);
select is_empty(
  $$ select 1 from public.map_items where id = 'd0000000-0000-4000-8000-000000000013' $$,
  'ma sulla mappa pubblica non vede il punto della propria organizzazione sospesa'
);

select * from finish();
rollback;
