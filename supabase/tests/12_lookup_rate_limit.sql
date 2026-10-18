-- Test 16: lookup_municipal_association restituisce solo found e name, ed è chiamabile solo dal server.
-- In più: check_rate_limit è solo per il server e blocca oltre il limite.
begin;
create extension if not exists pgtap with schema extensions;
set local search_path = extensions, public;
select no_plan();

insert into public.municipal_associations (cif, name, registry_number, district, neighborhood, category)
values ('G95000011', 'ASOCIACION DE BUSQUEDA', '12345', 'Centro', 'Sol', 'Culturales');

select is(
  (select array_agg(a.name::text order by a.ord)
   from pg_proc p, unnest(p.proargnames, p.proargmodes) with ordinality as a(name, mode, ord)
   where p.pronamespace = 'public'::regnamespace and p.proname = 'lookup_municipal_association'
     and a.mode = 't'),
  array['found', 'name'],
  'lookup_municipal_association restituisce solo found e name'
);

set local role service_role;
select results_eq(
  $$ select found, name from public.lookup_municipal_association('g 95000011') $$,
  $$ values (true, 'ASOCIACION DE BUSQUEDA'::text) $$,
  'NIF nell''elenco: trovato con il nome ufficiale'
);
select results_eq(
  $$ select found, name from public.lookup_municipal_association('G95000029') $$,
  $$ values (false, null::text) $$,
  'NIF fuori elenco: non trovato'
);
select is(public.check_rate_limit('test:limite', 2, interval '1 day'), true, 'primo tentativo ammesso');
select is(public.check_rate_limit('test:limite', 2, interval '1 day'), true, 'secondo tentativo ammesso');
select is(public.check_rate_limit('test:limite', 2, interval '1 day'), false, 'terzo tentativo bloccato');

reset role;
set local request.jwt.claims to '{"role":"anon"}';
set local role anon;
select throws_ok($$ select * from public.lookup_municipal_association('G95000011') $$, '42501', null,
  'anon non chiama lookup_municipal_association');
select throws_ok($$ select public.check_rate_limit('x', 1, interval '1 day') $$, '42501', null,
  'anon non chiama check_rate_limit');

reset role;
set local request.jwt.claims to '{"sub":"0000000a-0000-4000-8000-000000000001","role":"authenticated"}';
set local role authenticated;
select throws_ok($$ select * from public.lookup_municipal_association('G95000011') $$, '42501', null,
  'un utente non chiama lookup_municipal_association direttamente');
select throws_ok($$ select public.check_rate_limit('event:altro', 1, interval '1 day') $$, '42501', null,
  'un utente non consuma il limite di un altro');

select * from finish();
rollback;
