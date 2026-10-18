-- Test 12: un'organizzazione sospesa e i suoi eventi, fili e spazi spariscono per anon e per gli altri
-- utenti, anche da map_items e connection_lines; il suo membro li vede ancora.
-- In più: da sospesa non crea eventi, inviti né spazi.
begin;
create extension if not exists pgtap with schema extensions;
set local search_path = extensions, public;
select no_plan();

insert into auth.users (id, email) values
  ('0000000a-0000-4000-8000-000000000001', 's@test.invalid'),
  ('0000000b-0000-4000-8000-000000000001', 'b@test.invalid');
insert into public.organizations (id, kind, name, entry_method, location) values
  ('a0000000-0000-4000-8000-000000000001', 'association', 'Suspendida', 'self_declared', 'SRID=4326;POINT(-3.70 40.41)'),
  ('b0000000-0000-4000-8000-000000000001', 'association', 'Activa', 'self_declared', 'SRID=4326;POINT(-3.71 40.42)');
insert into public.memberships (user_id, organization_id) values
  ('0000000a-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001'),
  ('0000000b-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000001');
insert into public.events (id, title, category, starts_at, ends_at, address, location, owner_org) values
  ('e000000a-0000-4000-8000-000000000001', 'Evento suspendido', 'musica', now() + interval '1 day',
   now() + interval '1 day 2 hours', 'Calle', 'SRID=4326;POINT(-3.70 40.41)', 'a0000000-0000-4000-8000-000000000001');
insert into public.threads (id, proposer_org, receiver_org, status, story_proposer, confirmed_at) values
  ('70000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000001',
   'a0000000-0000-4000-8000-000000000001', 'confirmed', 'Historia', now());
insert into public.spaces (id, organization_id, space_type, price_type) values
  ('5000000a-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001', 'sala', 'free');

update public.organizations set status = 'suspended' where id = 'a0000000-0000-4000-8000-000000000001';

-- anon -----------------------------------------------------------------------
set local request.jwt.claims to '{"role":"anon"}';
set local role anon;
select is_empty($$ select 1 from public.organizations where id = 'a0000000-0000-4000-8000-000000000001' $$, 'anon: scheda nascosta');
select is_empty($$ select 1 from public.events where id = 'e000000a-0000-4000-8000-000000000001' $$, 'anon: evento nascosto');
select is_empty($$ select 1 from public.threads where id = '70000000-0000-4000-8000-000000000001' $$, 'anon: filo nascosto');
select is_empty($$ select 1 from public.map_items where id in ('a0000000-0000-4000-8000-000000000001', 'e000000a-0000-4000-8000-000000000001') $$,
  'anon: niente in map_items');
select is_empty($$ select 1 from public.connection_lines where id = '70000000-0000-4000-8000-000000000001' $$, 'anon: niente in connection_lines');
select is_empty($$ select 1 from public.event_organizers where event_id = 'e000000a-0000-4000-8000-000000000001' $$, 'anon: organizzatori nascosti');

-- altro utente ---------------------------------------------------------------
reset role;
set local request.jwt.claims to '{"sub":"0000000b-0000-4000-8000-000000000001","role":"authenticated"}';
set local role authenticated;
select is_empty($$ select 1 from public.organizations where id = 'a0000000-0000-4000-8000-000000000001' $$, 'altro utente: scheda nascosta');
select is_empty($$ select 1 from public.events where id = 'e000000a-0000-4000-8000-000000000001' $$, 'altro utente: evento nascosto');
select is_empty($$ select 1 from public.spaces where id = '5000000a-0000-4000-8000-000000000001' $$, 'altro utente: spazio nascosto');
select is_empty($$ select 1 from public.map_items where id in ('a0000000-0000-4000-8000-000000000001', 'e000000a-0000-4000-8000-000000000001') $$,
  'altro utente: niente in map_items');
select is_empty($$ select 1 from public.connection_lines where id = '70000000-0000-4000-8000-000000000001' $$,
  'altro utente (anche parte del filo): niente in connection_lines');

-- membro dell'organizzazione sospesa ------------------------------------------
reset role;
set local request.jwt.claims to '{"sub":"0000000a-0000-4000-8000-000000000001","role":"authenticated"}';
set local role authenticated;
select results_eq($$ select status::text from public.organizations where id = 'a0000000-0000-4000-8000-000000000001' $$,
  $$ values ('suspended') $$, 'il membro vede la propria scheda e lo stato');
select isnt_empty($$ select 1 from public.events where id = 'e000000a-0000-4000-8000-000000000001' $$, 'il membro vede il proprio evento');
select isnt_empty($$ select 1 from public.spaces where id = '5000000a-0000-4000-8000-000000000001' $$, 'il membro vede il proprio spazio');
select isnt_empty($$ select 1 from public.threads where id = '70000000-0000-4000-8000-000000000001' $$, 'il membro vede il proprio filo');
select isnt_empty($$ select 1 from public.map_items where id = 'e000000a-0000-4000-8000-000000000001' $$, 'il membro vede il proprio evento in map_items');

select throws_ok(
  $$ insert into public.events (title, category, starts_at, ends_at, address, location, owner_org)
     values ('Nuevo', 'musica', now() + interval '2 days', now() + interval '2 days 1 hour', 'Calle',
             'SRID=4326;POINT(-3.70 40.41)', 'a0000000-0000-4000-8000-000000000001') $$,
  '42501', null, 'da sospesa non crea eventi'
);
select throws_ok(
  $$ insert into public.invites (organization_id) values ('a0000000-0000-4000-8000-000000000001') $$,
  'P0001', 'invites_only_active_associations', 'da sospesa non crea inviti'
);
select throws_ok(
  $$ insert into public.spaces (organization_id, space_type, price_type) values ('a0000000-0000-4000-8000-000000000001', 'sala', 'free') $$,
  '42501', null, 'da sospesa non crea spazi'
);

select * from finish();
rollback;
