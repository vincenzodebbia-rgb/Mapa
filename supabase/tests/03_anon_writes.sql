-- Test 2: anon non può inserire, modificare o cancellare niente.
begin;
create extension if not exists pgtap with schema extensions;
set local search_path = extensions, public;
select no_plan();

select is(
  (select count(*)::integer from information_schema.role_table_grants
   where grantee = 'anon' and table_schema = 'public'
     and privilege_type in ('INSERT', 'UPDATE', 'DELETE', 'TRUNCATE')),
  0,
  'anon non ha grant di scrittura su nessuna tabella di public'
);
select is(
  (select count(*)::integer from information_schema.column_privileges
   where grantee = 'anon' and table_schema = 'public' and privilege_type <> 'SELECT'),
  0,
  'anon non ha grant di scrittura su nessuna colonna di public'
);

insert into public.organizations (id, kind, name, entry_method) values
  ('a0000000-0000-4000-8000-000000000001', 'association', 'Prueba A', 'self_declared');
insert into public.events (id, title, category, starts_at, ends_at, address, location, owner_org) values
  ('e0000000-0000-4000-8000-000000000001', 'Evento A', 'musica', now() + interval '1 day',
   now() + interval '1 day 2 hours', 'Calle Test 1', 'SRID=4326;POINT(-3.70 40.41)',
   'a0000000-0000-4000-8000-000000000001');

set local request.jwt.claims to '{"role":"anon"}';
set local role anon;

select throws_ok(
  $$ insert into public.organizations (kind, name, entry_method) values ('association', 'Intrusa', 'self_declared') $$,
  '42501', null, 'anon non crea organizzazioni'
);
select throws_ok(
  $$ update public.organizations set name = 'Hackeada' where id = 'a0000000-0000-4000-8000-000000000001' $$,
  '42501', null, 'anon non modifica organizzazioni'
);
select throws_ok(
  $$ delete from public.events where id = 'e0000000-0000-4000-8000-000000000001' $$,
  '42501', null, 'anon non cancella eventi'
);
select throws_ok(
  $$ insert into public.threads (proposer_org, receiver_org, story_proposer)
     values ('a0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001', 'x') $$,
  '42501', null, 'anon non crea fili'
);
select throws_ok(
  $$ insert into storage.objects (bucket_id, name) values ('event-images', 'a0000000-0000-4000-8000-000000000001/x.webp') $$,
  '42501', null, 'anon non carica immagini'
);
select throws_ok(
  $$ select public.register_entity('association', 'G98000019', 'Intrusa', 't1', 'p1', true) $$,
  '42501', null, 'anon non chiama register_entity'
);
select throws_ok(
  $$ select public.delete_my_account() $$,
  '42501', null, 'anon non chiama delete_my_account'
);

select * from finish();
rollback;
