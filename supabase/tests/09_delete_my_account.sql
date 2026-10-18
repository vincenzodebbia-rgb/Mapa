-- Test 8: delete_my_account non lascia righe che riferiscono l'utente né contenuti della sua organizzazione.
begin;
create extension if not exists pgtap with schema extensions;
set local search_path = extensions, public;
select no_plan();

insert into auth.users (id, email) values
  ('0000000a-0000-4000-8000-000000000001', 'a@test.invalid'),
  ('0000000b-0000-4000-8000-000000000001', 'b@test.invalid');
insert into public.organizations (id, kind, name, entry_method, location) values
  ('a0000000-0000-4000-8000-000000000001', 'association', 'Prueba A', 'self_declared', 'SRID=4326;POINT(-3.70 40.41)'),
  ('b0000000-0000-4000-8000-000000000001', 'association', 'Prueba B', 'self_declared', 'SRID=4326;POINT(-3.71 40.42)');
insert into public.memberships (user_id, organization_id) values
  ('0000000a-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001'),
  ('0000000b-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000001');
insert into public.organization_verifications (organization_id, nif) values
  ('a0000000-0000-4000-8000-000000000001', 'G96000011');
insert into public.organization_answers (organization_id, what_for_whom) values
  ('a0000000-0000-4000-8000-000000000001', 'Respuesta A');
insert into public.terms_acceptances (user_id, terms_version, privacy_version, age_confirmed) values
  ('0000000a-0000-4000-8000-000000000001', 't1', 'p1', true);
insert into public.invites (organization_id, created_by) values
  ('a0000000-0000-4000-8000-000000000001', '0000000a-0000-4000-8000-000000000001');
insert into public.events (id, title, category, starts_at, ends_at, address, location, owner_org) values
  ('e000000a-0000-4000-8000-000000000001', 'Evento A', 'musica', now() + interval '1 day',
   now() + interval '1 day 2 hours', 'Calle', 'SRID=4326;POINT(-3.70 40.41)', 'a0000000-0000-4000-8000-000000000001'),
  ('e000000b-0000-4000-8000-000000000001', 'Evento B', 'musica', now() + interval '1 day',
   now() + interval '1 day 2 hours', 'Calle', 'SRID=4326;POINT(-3.71 40.42)', 'b0000000-0000-4000-8000-000000000001');
-- A co-organizza un evento di B.
insert into public.event_organizers (event_id, organization_id, role) values
  ('e000000b-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001', 'co');
insert into public.threads (proposer_org, receiver_org, story_proposer) values
  ('a0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000001', 'Historia');
insert into public.spaces (organization_id, space_type, price_type) values
  ('a0000000-0000-4000-8000-000000000001', 'sala', 'free');

set local request.jwt.claims to '{"sub":"0000000a-0000-4000-8000-000000000001","role":"authenticated"}';
set local role authenticated;

select ok((public.export_my_data() ->> 'user') is not null, 'export_my_data restituisce i dati dell''utente');
select is(public.export_my_data() -> 'verification' ->> 'nif', 'G96000011', 'export_my_data include il NIF dell''ente');
select is(public.export_my_data() -> 'answers' ->> 'what_for_whom', 'Respuesta A', 'export_my_data include le risposte');
select lives_ok($$ select public.delete_my_account() $$, 'delete_my_account riesce');

reset role;

select is((select count(*)::integer from auth.users where id = '0000000a-0000-4000-8000-000000000001'), 0, 'utente eliminato');
select is((select count(*)::integer from public.memberships where user_id = '0000000a-0000-4000-8000-000000000001'), 0, 'nessuna membership');
select is((select count(*)::integer from public.terms_acceptances where user_id = '0000000a-0000-4000-8000-000000000001'), 0, 'nessuna accettazione');
select is((select count(*)::integer from public.invites where created_by = '0000000a-0000-4000-8000-000000000001'), 0, 'nessun invito creato dall''utente');
select is((select count(*)::integer from public.organizations where id = 'a0000000-0000-4000-8000-000000000001'), 0, 'organizzazione eliminata');
select is((select count(*)::integer from public.organization_verifications where organization_id = 'a0000000-0000-4000-8000-000000000001'), 0, 'verifica eliminata');
select is((select count(*)::integer from public.organization_answers where organization_id = 'a0000000-0000-4000-8000-000000000001'), 0, 'risposte eliminate');
select is((select count(*)::integer from public.events where owner_org = 'a0000000-0000-4000-8000-000000000001'), 0, 'eventi eliminati');
select is((select count(*)::integer from public.event_organizers where organization_id = 'a0000000-0000-4000-8000-000000000001'), 0, 'co-organizzazioni eliminate');
select is((select count(*)::integer from public.threads where 'a0000000-0000-4000-8000-000000000001' in (proposer_org, receiver_org)), 0, 'fili eliminati');
select is((select count(*)::integer from public.spaces where organization_id = 'a0000000-0000-4000-8000-000000000001'), 0, 'spazi eliminati');
select is((select count(*)::integer from public.events where id = 'e000000b-0000-4000-8000-000000000001'), 1, 'l''evento di B resta');

select * from finish();
rollback;
