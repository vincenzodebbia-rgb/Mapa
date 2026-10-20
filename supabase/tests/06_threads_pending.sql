-- Test 5: un filo pending lo vedono solo A e B, anche tramite connection_lines.
-- Dopo l'accettazione di B compare per tutti.
begin;
create extension if not exists pgtap with schema extensions;
set local search_path = extensions, public;
select no_plan();

insert into auth.users (id, email) values
  ('0000000a-0000-4000-8000-000000000001', 'a@test.invalid'),
  ('0000000b-0000-4000-8000-000000000001', 'b@test.invalid'),
  ('0000000c-0000-4000-8000-000000000001', 'c@test.invalid');
insert into public.organizations (id, kind, name, entry_method, location) values
  ('a0000000-0000-4000-8000-000000000001', 'association', 'Prueba A', 'self_declared', 'SRID=4326;POINT(-3.70 40.41)'),
  ('b0000000-0000-4000-8000-000000000001', 'association', 'Prueba B', 'self_declared', 'SRID=4326;POINT(-3.71 40.42)'),
  ('c0000000-0000-4000-8000-000000000001', 'association', 'Prueba C', 'self_declared', 'SRID=4326;POINT(-3.72 40.43)');
insert into public.memberships (user_id, organization_id) values
  ('0000000a-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001'),
  ('0000000b-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000001'),
  ('0000000c-0000-4000-8000-000000000001', 'c0000000-0000-4000-8000-000000000001');

-- A propone il filo a B.
set local request.jwt.claims to '{"sub":"0000000a-0000-4000-8000-000000000001","role":"authenticated"}';
set local role authenticated;
insert into public.threads (proposer_org, receiver_org, story_proposer) values
  ('a0000000-0000-4000-8000-000000000001',
   'b0000000-0000-4000-8000-000000000001', 'Nos conocimos en el mercado');

select isnt_empty($$ select 1 from public.threads where story_proposer = 'Nos conocimos en el mercado' $$,
  'A vede il filo pending');
select throws_ok(
  $$ update public.threads set status = 'confirmed' where story_proposer = 'Nos conocimos en el mercado' $$,
  'P0001', 'thread_forbidden_change', 'A non può accettare il proprio filo'
);

reset role;
set local request.jwt.claims to '{"sub":"0000000c-0000-4000-8000-000000000001","role":"authenticated"}';
set local role authenticated;
select is_empty($$ select 1 from public.threads where story_proposer = 'Nos conocimos en el mercado' $$,
  'C (terzo) non vede il filo pending');
select is_empty($$ select 1 from public.connection_lines where story_proposer = 'Nos conocimos en el mercado' $$,
  'C non vede il filo pending in connection_lines');

reset role;
set local request.jwt.claims to '{"role":"anon"}';
set local role anon;
select is_empty($$ select 1 from public.threads where story_proposer = 'Nos conocimos en el mercado' $$,
  'anon non vede il filo pending');
select is_empty($$ select 1 from public.connection_lines where story_proposer = 'Nos conocimos en el mercado' $$,
  'anon non vede il filo pending in connection_lines');

-- B lo vede e lo accetta.
reset role;
set local request.jwt.claims to '{"sub":"0000000b-0000-4000-8000-000000000001","role":"authenticated"}';
set local role authenticated;
select isnt_empty($$ select 1 from public.threads where story_proposer = 'Nos conocimos en el mercado' $$,
  'B vede il filo pending');
select lives_ok(
  $$ update public.threads set status = 'confirmed', story_receiver = 'Y luego hicimos un taller'
     where story_proposer = 'Nos conocimos en el mercado' $$,
  'B accetta il filo'
);

reset role;
set local request.jwt.claims to '{"role":"anon"}';
set local role anon;
select results_eq(
  $$ select proposer_slug, receiver_slug, story_receiver from public.connection_lines
     where story_proposer = 'Nos conocimos en el mercado' $$,
  $$ values ('prueba-a'::text, 'prueba-b'::text, 'Y luego hicimos un taller'::text) $$,
  'dopo l''accettazione anon vede il filo in connection_lines'
);

reset role;
select isnt((select confirmed_at from public.threads where story_proposer = 'Nos conocimos en el mercado'),
  null, 'confirmed_at impostato all''accettazione');

select * from finish();
rollback;
