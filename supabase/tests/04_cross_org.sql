-- Test 3: un membro di A non modifica scheda, eventi, spazi o storie dei fili di B.
begin;
create extension if not exists pgtap with schema extensions;
set local search_path = extensions, public;
select no_plan();

insert into auth.users (id, email) values
  ('0000000a-0000-4000-8000-000000000001', 'a@test.invalid'),
  ('0000000b-0000-4000-8000-000000000001', 'b@test.invalid');
insert into public.organizations (id, kind, name, entry_method) values
  ('a0000000-0000-4000-8000-000000000001', 'association', 'Prueba A', 'self_declared'),
  ('b0000000-0000-4000-8000-000000000001', 'association', 'Prueba B', 'self_declared');
insert into public.memberships (user_id, organization_id) values
  ('0000000a-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001'),
  ('0000000b-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000001');
insert into public.events (id, title, category, starts_at, ends_at, address, location, owner_org) values
  ('e000000b-0000-4000-8000-000000000001', 'Evento B', 'musica', now() + interval '1 day',
   now() + interval '1 day 2 hours', 'Calle Test 2', 'SRID=4326;POINT(-3.71 40.42)',
   'b0000000-0000-4000-8000-000000000001');
insert into public.spaces (id, organization_id, space_type, price_type, description) values
  ('5000000b-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000001', 'sala', 'free', 'Sala B');
-- Filo proposto da B ad A e confermato.
insert into public.threads (id, proposer_org, receiver_org, status, story_proposer, confirmed_at) values
  ('70000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000001',
   'a0000000-0000-4000-8000-000000000001', 'confirmed', 'Historia de B', now());

set local request.jwt.claims to '{"sub":"0000000a-0000-4000-8000-000000000001","role":"authenticated"}';
set local role authenticated;

update public.organizations set name = 'Hackeada' where id = 'b0000000-0000-4000-8000-000000000001';
update public.events set title = 'Hackeado' where id = 'e000000b-0000-4000-8000-000000000001';
delete from public.events where id = 'e000000b-0000-4000-8000-000000000001';
update public.spaces set description = 'Hackeada' where id = '5000000b-0000-4000-8000-000000000001';
delete from public.spaces where id = '5000000b-0000-4000-8000-000000000001';

select throws_ok(
  $$ update public.threads set story_proposer = 'Hackeada' where id = '70000000-0000-4000-8000-000000000001' $$,
  'P0001', 'thread_forbidden_change', 'A (receiver) non modifica la storia di B (proposer)'
);
select throws_ok(
  $$ insert into public.events (title, category, starts_at, ends_at, address, location, owner_org)
     values ('Intruso', 'musica', now() + interval '1 day', now() + interval '1 day 1 hour', 'Calle',
             'SRID=4326;POINT(-3.70 40.41)', 'b0000000-0000-4000-8000-000000000001') $$,
  '42501', null, 'A non crea eventi a nome di B'
);
select throws_ok(
  $$ insert into public.spaces (organization_id, space_type, price_type)
     values ('b0000000-0000-4000-8000-000000000001', 'sala', 'free') $$,
  '42501', null, 'A non crea spazi a nome di B'
);
select lives_ok(
  $$ update public.threads set story_receiver = 'Historia de A' where id = '70000000-0000-4000-8000-000000000001' $$,
  'A modifica la propria storia del filo'
);

reset role;

select is(
  (select name from public.organizations where id = 'b0000000-0000-4000-8000-000000000001'),
  'Prueba B', 'la scheda di B non è cambiata'
);
select is(
  (select title from public.events where id = 'e000000b-0000-4000-8000-000000000001'),
  'Evento B', 'l''evento di B esiste ancora e non è cambiato'
);
select is(
  (select description from public.spaces where id = '5000000b-0000-4000-8000-000000000001'),
  'Sala B', 'lo spazio di B esiste ancora e non è cambiato'
);
select is(
  (select story_proposer from public.threads where id = '70000000-0000-4000-8000-000000000001'),
  'Historia de B', 'la storia di B non è cambiata'
);

select * from finish();
rollback;
