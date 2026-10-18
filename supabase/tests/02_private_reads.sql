-- Test 1 e 11: anon e utenti normali non leggono le tabelle private
-- né le risposte e le accettazioni degli altri. Le colonne di revisione non sono pubbliche.
begin;
create extension if not exists pgtap with schema extensions;
set local search_path = extensions, public;
select no_plan();

insert into auth.users (id, email) values
  ('0000000a-0000-4000-8000-000000000001', 'a@test.invalid'),
  ('0000000b-0000-4000-8000-000000000001', 'b@test.invalid'),
  ('0000000c-0000-4000-8000-000000000001', 'c@test.invalid');
insert into public.organizations (id, kind, name, entry_method) values
  ('a0000000-0000-4000-8000-000000000001', 'association', 'Prueba A', 'self_declared'),
  ('b0000000-0000-4000-8000-000000000001', 'association', 'Prueba B', 'self_declared');
insert into public.memberships (user_id, organization_id) values
  ('0000000a-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001'),
  ('0000000b-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000001');
insert into public.organization_answers (organization_id, what_for_whom) values
  ('a0000000-0000-4000-8000-000000000001', 'Respuesta A'),
  ('b0000000-0000-4000-8000-000000000001', 'Respuesta B');
insert into public.terms_acceptances (user_id, terms_version, privacy_version, age_confirmed) values
  ('0000000a-0000-4000-8000-000000000001', 't1', 'p1', true),
  ('0000000b-0000-4000-8000-000000000001', 't1', 'p1', true);
insert into public.organization_verifications (organization_id, nif) values
  ('a0000000-0000-4000-8000-000000000001', 'G98000019');
insert into public.municipal_associations (cif, name) values ('G98000027', 'ASOCIACION TEST');
insert into public.app_admins (user_id) values ('0000000c-0000-4000-8000-000000000001');
insert into public.moderation_actions (organization_id, organization_name, action, reason)
values ('b0000000-0000-4000-8000-000000000001', 'Prueba B', 'suspend', 'motivo de prueba');
insert into public.geocode_cache (query_normalized, display_name) values ('calle test 1', 'Calle Test 1');
insert into public.rate_limits (key, window_start, count) values ('test', now(), 1);

-- anon ------------------------------------------------------------------------
set local request.jwt.claims to '{"role":"anon"}';
set local role anon;

select throws_ok('select 1 from public.municipal_associations', '42501', null, 'anon: municipal_associations');
select throws_ok('select 1 from public.organization_verifications', '42501', null, 'anon: organization_verifications');
select throws_ok('select 1 from public.organization_answers', '42501', null, 'anon: organization_answers');
select throws_ok('select 1 from public.terms_acceptances', '42501', null, 'anon: terms_acceptances');
select throws_ok('select 1 from public.geocode_cache', '42501', null, 'anon: geocode_cache');
select throws_ok('select 1 from public.rate_limits', '42501', null, 'anon: rate_limits');
select throws_ok('select 1 from public.app_admins', '42501', null, 'anon: app_admins');
select throws_ok('select 1 from public.moderation_actions', '42501', null, 'anon: moderation_actions');
select throws_ok('select 1 from public.memberships', '42501', null, 'anon: memberships');
select throws_ok('select 1 from public.invites', '42501', null, 'anon: invites');
select throws_ok('select 1 from public.spaces', '42501', null, 'anon: spaces');
select throws_ok('select flagged_for_review from public.organizations', '42501', null, 'anon: flagged_for_review non è pubblico');
select throws_ok('select entry_method from public.organizations', '42501', null, 'anon: entry_method non è pubblico');
select lives_ok('select id, name, slug from public.organizations', 'anon: la scheda pubblica si legge');

-- utente A --------------------------------------------------------------------
reset role;
set local request.jwt.claims to '{"sub":"0000000a-0000-4000-8000-000000000001","role":"authenticated"}';
set local role authenticated;

select throws_ok('select 1 from public.municipal_associations', '42501', null, 'utente: municipal_associations');
select throws_ok('select 1 from public.organization_verifications', '42501', null, 'utente: organization_verifications');
select throws_ok('select 1 from public.geocode_cache', '42501', null, 'utente: geocode_cache');
select throws_ok('select 1 from public.rate_limits', '42501', null, 'utente: rate_limits');
select throws_ok('select 1 from public.app_admins', '42501', null, 'utente: app_admins');
select throws_ok('select 1 from public.moderation_actions', '42501', null, 'utente: moderation_actions');
select throws_ok('select last_reviewed_at from public.organizations', '42501', null, 'utente: last_reviewed_at non è pubblico');

select is_empty(
  $$ select 1 from public.organization_answers where organization_id = 'b0000000-0000-4000-8000-000000000001' $$,
  'A non legge le risposte di B'
);
select isnt_empty(
  $$ select 1 from public.organization_answers where organization_id = 'a0000000-0000-4000-8000-000000000001' $$,
  'A legge le proprie risposte'
);
select is_empty(
  $$ select 1 from public.terms_acceptances where user_id = '0000000b-0000-4000-8000-000000000001' $$,
  'A non legge le accettazioni di B'
);
select is_empty(
  $$ select 1 from public.memberships where user_id = '0000000b-0000-4000-8000-000000000001' $$,
  'A non legge le membership di B'
);

select * from finish();
rollback;
