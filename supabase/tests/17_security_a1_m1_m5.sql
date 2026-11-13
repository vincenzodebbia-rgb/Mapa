-- Correzioni di sicurezza del 10 novembre (docs/rapporti/sicurezza-2026-11.md, docs/decisioni/2026-11-10-verifica.md).
-- A1: "verified" non è leggibile da nessuno via API, nessuno è verificato, le policy e le viste non dipendono
--     dall'elenco del Comune.
-- M1: il tetto di 20 eventi al giorno vale anche per gli insert diretti in events.
-- M5: register_entity e create_professional hanno il tetto delle nuove organizzazioni, anche chiamate via RPC.
begin;
create extension if not exists pgtap with schema extensions;
set local search_path = extensions, public;
select no_plan();

insert into auth.users (id, email) values
  ('00000001-0000-4000-8000-000000000017', 'u1@test.invalid'),
  ('00000002-0000-4000-8000-000000000017', 'u2@test.invalid'),
  ('00000003-0000-4000-8000-000000000017', 'u3@test.invalid'),
  ('00000004-0000-4000-8000-000000000017', 'u4@test.invalid'),
  ('0000000a-0000-4000-8000-000000000017', 'a@test.invalid'),
  ('0000000b-0000-4000-8000-000000000017', 'b@test.invalid');
insert into public.municipal_associations (cif, name) values ('G94000017', 'ASOCIACION DEL ELENCO 17');
insert into public.organizations (id, kind, name, entry_method) values
  ('a0000000-0000-4000-8000-000000000017', 'association', 'Prueba A 17', 'self_declared'),
  ('b0000000-0000-4000-8000-000000000017', 'association', 'Prueba B 17', 'self_declared');
insert into public.memberships (user_id, organization_id) values
  ('0000000a-0000-4000-8000-000000000017', 'a0000000-0000-4000-8000-000000000017'),
  ('0000000b-0000-4000-8000-000000000017', 'b0000000-0000-4000-8000-000000000017');

-- A1 ----------------------------------------------------------------------------

select is(has_column_privilege('anon', 'public.organizations', 'verified', 'select'), false,
  'anon non legge verified');
select is(has_column_privilege('authenticated', 'public.organizations', 'verified', 'select'), false,
  'authenticated non legge verified');
select is((select count(*)::integer from public.organizations where verified), 0,
  'nessuna organizzazione è verificata');
select is(
  (select count(*)::integer from pg_policies
   where coalesce(qual, '') || coalesce(with_check, '') ~* '(verified|municipal_registry|municipal_associations)'),
  0, 'nessuna policy dà diritti per verified o per l''elenco del Comune'
);
select is(
  (select count(*)::integer from information_schema.columns c
   join information_schema.views v on v.table_schema = c.table_schema and v.table_name = c.table_name
   where c.table_schema = 'public' and c.column_name = 'verified'),
  0, 'nessuna vista pubblica espone verified'
);

-- Una scheda nell'elenco del Comune entra come municipal_registry (dato interno), ma non verificata.
-- Il tetto M5 si azzera per questo test, così non dipende da altre iscrizioni dell'ultima ora su mapa-dev.
insert into public.rate_limits (key, window_start, count)
values ('db:new-organizations', to_timestamp(floor(extract(epoch from now()) / 3600) * 3600), 0)
on conflict (key, window_start) do update set count = 0;

set local request.jwt.claims to '{"sub":"00000001-0000-4000-8000-000000000017","role":"authenticated"}';
set local role authenticated;
select results_eq(
  $$ select flagged from public.register_entity('association', 'G94000017', 'Asociación del Elenco 17', 't1', 'p1', true) $$,
  $$ values (false) $$,
  'associazione nell''elenco: si iscrive'
);
select throws_ok($$ select verified from public.organizations $$, '42501', null,
  'l''utente non legge verified nemmeno della propria scheda');
reset role;
select results_eq(
  $$ select o.entry_method::text, o.verified from public.organizations o
     join public.memberships m on m.organization_id = o.id
     where m.user_id = '00000001-0000-4000-8000-000000000017' $$,
  $$ values ('municipal_registry', false) $$,
  'NIF nell''elenco: entry_method municipal_registry, verified resta false'
);

set local request.jwt.claims to '{"role":"anon"}';
set local role anon;
select throws_ok($$ select verified from public.organizations $$, '42501', null, 'anon non legge verified');
select lives_ok($$ select id, name from public.organizations $$, 'anon legge ancora le colonne pubbliche');
reset role;

-- M5 ----------------------------------------------------------------------------

select is(
  (select r.count from public.rate_limits r
   where r.key = 'db:new-organizations' and r.window_start = to_timestamp(floor(extract(epoch from now()) / 3600) * 3600)),
  1, 'un''iscrizione riuscita conta una volta'
);

-- Un'iscrizione che fallisce non consuma il tetto (la transazione si annulla, conteggio compreso).
set local request.jwt.claims to '{"sub":"00000002-0000-4000-8000-000000000017","role":"authenticated"}';
set local role authenticated;
select throws_ok(
  $$ select public.register_entity('association', '12345678Z', 'Con DNI', 't1', 'p1', true) $$,
  'P0001', 'personal_nif', 'un NIF personale fallisce'
);
reset role;
select is(
  (select r.count from public.rate_limits r
   where r.key = 'db:new-organizations' and r.window_start = to_timestamp(floor(extract(epoch from now()) / 3600) * 3600)),
  1, 'un''iscrizione fallita non conta'
);

-- Tetto raggiunto: tutte e due le funzioni rifiutano, anche chiamate direttamente via RPC.
update public.rate_limits set count = 60
where key = 'db:new-organizations' and window_start = to_timestamp(floor(extract(epoch from now()) / 3600) * 3600);

set local request.jwt.claims to '{"sub":"00000003-0000-4000-8000-000000000017","role":"authenticated"}';
set local role authenticated;
select throws_ok(
  $$ select public.register_entity('association', 'G94000025', 'Una más', 't1', 'p1', true) $$,
  'P0001', 'rate_limited', 'register_entity oltre il tetto: rate_limited'
);
reset role;
set local request.jwt.claims to '{"sub":"00000004-0000-4000-8000-000000000017","role":"authenticated"}';
set local role authenticated;
select throws_ok(
  $$ select public.create_professional('Otra persona', 'Hago cosas', 't1', 'p1', true) $$,
  'P0001', 'rate_limited', 'create_professional oltre il tetto: rate_limited'
);
reset role;
select is(
  (select count(*)::integer from public.memberships
   where user_id in ('00000003-0000-4000-8000-000000000017', '00000004-0000-4000-8000-000000000017')),
  0, 'oltre il tetto non nasce nessuna organizzazione'
);
select is(has_function_privilege('authenticated', 'private.assert_rate_limit(text, integer, interval)', 'execute'),
  false, 'l''helper del limite non si chiama via RPC');

-- M1 ----------------------------------------------------------------------------

set local request.jwt.claims to '{"sub":"0000000a-0000-4000-8000-000000000017","role":"authenticated"}';
set local role authenticated;
select lives_ok(
  $$ insert into public.events (title, category, starts_at, ends_at, address, location, owner_org)
     values ('Evento 1', 'musica', now() + interval '1 day', now() + interval '1 day 1 hour', 'Calle Test 1',
             'SRID=4326;POINT(-3.70 40.41)', 'a0000000-0000-4000-8000-000000000017') $$,
  'un membro crea un evento con un insert diretto'
);
-- Un insert rifiutato dalla RLS non consuma il limite di un'altra organizzazione.
select throws_ok(
  $$ insert into public.events (title, category, starts_at, ends_at, address, location, owner_org)
     values ('Intruso', 'musica', now() + interval '1 day', now() + interval '1 day 1 hour', 'Calle Test 2',
             'SRID=4326;POINT(-3.70 40.41)', 'b0000000-0000-4000-8000-000000000017') $$,
  '42501', null, 'A non crea eventi a nome di B'
);
reset role;
select is(
  (select r.count from public.rate_limits r
   where r.key = 'db:event:a0000000-0000-4000-8000-000000000017'
     and r.window_start = to_timestamp(floor(extract(epoch from now()) / 86400) * 86400)),
  1, 'l''insert diretto conta nel limite dell''organizzazione'
);
select is(
  (select count(*)::integer from public.rate_limits r where r.key = 'db:event:b0000000-0000-4000-8000-000000000017'),
  0, 'l''insert rifiutato non tocca il limite di B'
);

-- Venti eventi oggi: il ventunesimo, diretto via API, si rifiuta.
update public.rate_limits set count = 20
where key = 'db:event:a0000000-0000-4000-8000-000000000017'
  and window_start = to_timestamp(floor(extract(epoch from now()) / 86400) * 86400);
set local request.jwt.claims to '{"sub":"0000000a-0000-4000-8000-000000000017","role":"authenticated"}';
set local role authenticated;
select throws_ok(
  $$ insert into public.events (title, category, starts_at, ends_at, address, location, owner_org)
     values ('Evento 21', 'musica', now() + interval '2 days', now() + interval '2 days 1 hour', 'Calle Test 1',
             'SRID=4326;POINT(-3.70 40.41)', 'a0000000-0000-4000-8000-000000000017') $$,
  'P0001', 'rate_limited', 'il ventunesimo evento del giorno si rifiuta'
);
reset role;
select is((select count(*)::integer from public.events where owner_org = 'a0000000-0000-4000-8000-000000000017'), 1,
  'oltre il limite non nasce nessun evento');

-- Senza utente (seed, migrazioni, server con service_role) non si conta.
set local request.jwt.claims to '{}';
select lives_ok(
  $$ insert into public.events (title, category, starts_at, ends_at, address, location, owner_org)
     values ('Evento del seed', 'musica', now() + interval '3 days', now() + interval '3 days 1 hour', 'Calle Test 1',
             'SRID=4326;POINT(-3.70 40.41)', 'a0000000-0000-4000-8000-000000000017') $$,
  'un insert senza utente non passa dal limite'
);

select * from finish();
rollback;
