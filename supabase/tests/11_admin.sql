-- Test 13: admin_review_list, moderate_organization e mark_reviewed falliscono per un non-admin;
-- per un admin admin_review_list non ha colonne con NIF, email, telefono o user id.
begin;
create extension if not exists pgtap with schema extensions;
set local search_path = extensions, public;
select no_plan();

insert into auth.users (id, email) values
  ('0000000a-0000-4000-8000-000000000001', 'admin@test.invalid'),
  ('0000000b-0000-4000-8000-000000000001', 'b@test.invalid');
insert into public.app_admins (user_id) values ('0000000a-0000-4000-8000-000000000001');
insert into public.organizations (id, kind, name, entry_method, venue_activity, flagged_for_review) values
  ('b0000000-0000-4000-8000-000000000001', 'venue', 'Club de Prueba', 'self_declared', 'discoteca_club', true),
  ('c0000000-0000-4000-8000-000000000001', 'association', 'Para Eliminar', 'self_declared', null, false);
insert into public.memberships (user_id, organization_id) values
  ('0000000b-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000001');
insert into public.organization_answers (organization_id, what_for_whom, how_sustained) values
  ('b0000000-0000-4000-8000-000000000001', 'Conciertos', 'Entradas');

select is(
  (select array_agg(a.col::text) from pg_proc p, unnest(p.proargnames) as a(col)
   where p.pronamespace = 'public'::regnamespace and p.proname = 'admin_review_list'
     and a.col ~* '(nif|cif|email|phone|telefono|user)'),
  null,
  'admin_review_list non restituisce NIF, email, telefono né user id'
);

-- non admin ------------------------------------------------------------------
set local request.jwt.claims to '{"sub":"0000000b-0000-4000-8000-000000000001","role":"authenticated"}';
set local role authenticated;
select is(public.is_admin(), false, 'un utente normale non è admin');
select throws_ok($$ select * from public.admin_review_list() $$, 'P0001', 'forbidden', 'non-admin: admin_review_list vietata');
select throws_ok(
  $$ select public.moderate_organization('b0000000-0000-4000-8000-000000000001', 'suspend', 'motivo') $$,
  'P0001', 'forbidden', 'non-admin: moderate_organization vietata'
);
select throws_ok(
  $$ select public.mark_reviewed('b0000000-0000-4000-8000-000000000001') $$,
  'P0001', 'forbidden', 'non-admin: mark_reviewed vietata'
);

-- admin ----------------------------------------------------------------------
reset role;
set local request.jwt.claims to '{"sub":"0000000a-0000-4000-8000-000000000001","role":"authenticated"}';
set local role authenticated;
select is(public.is_admin(), true, 'l''admin è admin');
select results_eq(
  $$ select name, what_for_whom, how_sustained, flagged_for_review from public.admin_review_list()
     where id = 'b0000000-0000-4000-8000-000000000001' $$,
  $$ values ('Club de Prueba'::text, 'Conciertos'::text, 'Entradas'::text, true) $$,
  'l''admin vede nome, risposte e avviso'
);
select throws_ok(
  $$ select public.moderate_organization('b0000000-0000-4000-8000-000000000001', 'suspend', '   ') $$,
  'P0001', 'reason_required', 'senza motivo non si modera'
);
select is(
  public.moderate_organization('b0000000-0000-4000-8000-000000000001', 'suspend', 'Contenido ilegal de prueba'),
  'b@test.invalid', 'senza contatto pubblico restituisce l''email del membro per la motivazione'
);
select lives_ok($$ select public.mark_reviewed('b0000000-0000-4000-8000-000000000001') $$, 'mark_reviewed riesce');
select lives_ok(
  $$ select public.moderate_organization('c0000000-0000-4000-8000-000000000001', 'delete', 'Duplicado de prueba') $$,
  'l''admin elimina un''organizzazione'
);

reset role;
select results_eq(
  $$ select status::text, flagged_for_review, last_reviewed_at is not null from public.organizations
     where id = 'b0000000-0000-4000-8000-000000000001' $$,
  $$ values ('suspended', false, true) $$,
  'sospesa, avviso spento, revisione registrata'
);
select is((select count(*)::integer from public.organizations where id = 'c0000000-0000-4000-8000-000000000001'), 0,
  'organizzazione eliminata');
select results_eq(
  $$ select action::text, organization_name from public.moderation_actions
     where organization_id in ('b0000000-0000-4000-8000-000000000001', 'c0000000-0000-4000-8000-000000000001')
     order by action::text $$,
  $$ values ('delete', 'Para Eliminar'::text), ('suspend', 'Club de Prueba'::text) $$,
  'lo storico resta, anche dopo l''eliminazione'
);

select * from finish();
rollback;
