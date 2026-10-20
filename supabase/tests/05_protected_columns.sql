-- Test 4 e 15: un utente non cambia kind, slug, verified, last_activity_at, entry_method, status,
-- flagged_for_review, last_reviewed_at della propria organizzazione.
-- In più: passare a un'attività dubbia riaccende l'avviso di revisione.
begin;
create extension if not exists pgtap with schema extensions;
set local search_path = extensions, public;
select no_plan();

insert into auth.users (id, email) values
  ('0000000a-0000-4000-8000-000000000001', 'a@test.invalid'),
  ('0000000b-0000-4000-8000-000000000001', 'b@test.invalid');
insert into public.organizations (id, kind, name, entry_method, venue_activity) values
  ('a0000000-0000-4000-8000-000000000001', 'association', 'Prueba A', 'self_declared', null),
  ('b0000000-0000-4000-8000-000000000001', 'venue', 'Librería B', 'self_declared', 'libreria');
insert into public.memberships (user_id, organization_id) values
  ('0000000a-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001'),
  ('0000000b-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000001');

set local request.jwt.claims to '{"sub":"0000000a-0000-4000-8000-000000000001","role":"authenticated"}';
set local role authenticated;

select throws_ok($$ update public.organizations set kind = 'professional' where id = 'a0000000-0000-4000-8000-000000000001' $$,
  '42501', null, 'kind non si cambia');
select throws_ok($$ update public.organizations set slug = 'otro-slug' where id = 'a0000000-0000-4000-8000-000000000001' $$,
  '42501', null, 'slug non si cambia');
select throws_ok($$ update public.organizations set verified = true where id = 'a0000000-0000-4000-8000-000000000001' $$,
  '42501', null, 'verified non si cambia');
select throws_ok($$ update public.organizations set last_activity_at = now() where id = 'a0000000-0000-4000-8000-000000000001' $$,
  '42501', null, 'last_activity_at non si cambia');
select throws_ok($$ update public.organizations set entry_method = 'municipal_registry' where id = 'a0000000-0000-4000-8000-000000000001' $$,
  '42501', null, 'entry_method non si cambia');
select throws_ok($$ update public.organizations set status = 'active' where id = 'a0000000-0000-4000-8000-000000000001' $$,
  '42501', null, 'status non si cambia');
select throws_ok($$ update public.organizations set flagged_for_review = false where id = 'a0000000-0000-4000-8000-000000000001' $$,
  '42501', null, 'flagged_for_review non si cambia');
select throws_ok($$ update public.organizations set last_reviewed_at = now() where id = 'a0000000-0000-4000-8000-000000000001' $$,
  '42501', null, 'last_reviewed_at non si cambia');
select lives_ok($$ update public.organizations set name = 'Prueba A renombrada' where id = 'a0000000-0000-4000-8000-000000000001' $$,
  'il nome si cambia');

reset role;
select is((select slug from public.organizations where id = 'a0000000-0000-4000-8000-000000000001'),
  'prueba-a', 'lo slug resta quello della creazione anche dopo il cambio di nome');

-- La librería passa a discoteca: l'avviso si accende; tornare a libreria non lo spegne.
set local request.jwt.claims to '{"sub":"0000000b-0000-4000-8000-000000000001","role":"authenticated"}';
set local role authenticated;
update public.organizations set venue_activity = 'discoteca_club' where id = 'b0000000-0000-4000-8000-000000000001';
update public.organizations set venue_activity = 'libreria' where id = 'b0000000-0000-4000-8000-000000000001';
reset role;
select is((select flagged_for_review from public.organizations where id = 'b0000000-0000-4000-8000-000000000001'),
  true, 'passare a un''attività dubbia accende flagged_for_review e tornare indietro non lo spegne');

select * from finish();
rollback;
