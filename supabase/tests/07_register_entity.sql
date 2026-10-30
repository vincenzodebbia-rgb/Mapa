-- Test 6 e 14: register_entity decide entry_method e avviso, rifiuta NIF usati o personali,
-- e chiede attività, risposte e indirizzo agli espacios (entity_type 'commercial').
-- Sessione 5: i documenti personali hanno il codice proprio personal_nif; l'associazione fuori elenco
-- senza invito ora è segnalata (decisione del 29 ottobre). Gli altri tipi: 16_entity_types.sql.
begin;
create extension if not exists pgtap with schema extensions;
set local search_path = extensions, public;
select no_plan();

insert into auth.users (id, email) values
  ('00000001-0000-4000-8000-000000000001', 'u1@test.invalid'),
  ('00000002-0000-4000-8000-000000000001', 'u2@test.invalid'),
  ('00000003-0000-4000-8000-000000000001', 'u3@test.invalid'),
  ('00000004-0000-4000-8000-000000000001', 'u4@test.invalid'),
  ('00000005-0000-4000-8000-000000000001', 'u5@test.invalid'),
  ('00000006-0000-4000-8000-000000000001', 'u6@test.invalid'),
  ('00000007-0000-4000-8000-000000000001', 'u7@test.invalid');
insert into public.municipal_associations (cif, name) values ('G97000011', 'ASOCIACION DEL ELENCO DE PRUEBA');
-- Un'associazione attiva che invita.
insert into public.organizations (id, kind, name, entry_method) values
  ('a0000000-0000-4000-8000-000000000001', 'association', 'Anfitriona', 'self_declared');
insert into public.invites (token, organization_id) values ('token-de-prueba-valido', 'a0000000-0000-4000-8000-000000000001');

-- u1: associazione nell'elenco ------------------------------------------------
set local request.jwt.claims to '{"sub":"00000001-0000-4000-8000-000000000001","role":"authenticated"}';
set local role authenticated;
select results_eq(
  $$ select flagged from public.register_entity('association', 'g-9700001 1', 'Asociación del Elenco', 't1', 'p1', true) $$,
  $$ values (false) $$,
  'associazione nell''elenco: non segnalata (il NIF si normalizza)'
);
select throws_ok(
  $$ select public.register_entity('association', 'G97000029', 'Otra', 't1', 'p1', true) $$,
  'P0001', 'already_member', 'un utente con un''organizzazione non ne crea un''altra'
);
reset role;
select results_eq(
  $$ select o.entry_method::text, o.verified, o.kind::text from public.organizations o
     join public.memberships m on m.organization_id = o.id
     where m.user_id = '00000001-0000-4000-8000-000000000001' $$,
  $$ values ('municipal_registry', true, 'association') $$,
  'entry_method municipal_registry e verified = true'
);
select is(
  (select count(*)::integer from public.memberships where user_id = '00000001-0000-4000-8000-000000000001'),
  1, 'una sola membership'
);
select is(
  (select count(*)::integer from public.terms_acceptances where user_id = '00000001-0000-4000-8000-000000000001'),
  1, 'accettazione salvata'
);

-- u2: NIF già usato, NIF personali -------------------------------------------
set local request.jwt.claims to '{"sub":"00000002-0000-4000-8000-000000000001","role":"authenticated"}';
set local role authenticated;
select throws_ok(
  $$ select public.register_entity('association', 'G97000011', 'Copia', 't1', 'p1', true) $$,
  'P0001', 'already_claimed', 'un NIF già usato fallisce'
);
select throws_ok(
  $$ select public.register_entity('association', '12345678Z', 'Persona', 't1', 'p1', true) $$,
  'P0001', 'personal_nif', 'un DNI viene rifiutato'
);
select throws_ok(
  $$ select public.register_entity('association', 'X1234567L', 'Persona', 't1', 'p1', true) $$,
  'P0001', 'personal_nif', 'un NIE viene rifiutato'
);
select throws_ok(
  $$ select public.register_entity('association', 'G97000029', 'Sin edad', 't1', 'p1', false) $$,
  'P0001', 'terms_required', 'senza dichiarazione di età fallisce'
);
select throws_ok(
  $$ select public.register_entity('informal', 'G97000029', 'Pro', 't1', 'p1', true) $$,
  'P0001', 'invalid_kind', 'i professionisti passano da create_professional'
);
-- u2: associazione fuori elenco, senza invito: entra con avviso (decisione del 29 ottobre).
select results_eq(
  $$ select flagged, flag_reason::text
     from public.register_entity('association', 'G97000029', 'Fuera del elenco', 't1', 'p1', true) $$,
  $$ values (true, 'not_in_registry') $$,
  'associazione fuori elenco senza invito: segnalata con not_in_registry'
);
reset role;
select is(
  (select o.entry_method::text from public.organizations o join public.memberships m on m.organization_id = o.id
   where m.user_id = '00000002-0000-4000-8000-000000000001'),
  'self_declared', 'associazione fuori elenco: self_declared, non verificata'
);

-- u3: discoteca con invito valido --------------------------------------------
set local request.jwt.claims to '{"sub":"00000003-0000-4000-8000-000000000001","role":"authenticated"}';
set local role authenticated;
select results_eq(
  $$ select flagged from public.register_entity('commercial', 'B97000037', 'Discoteca Invitada', 't1', 'p1', true,
       p_invite_token => 'token-de-prueba-valido', p_venue_activity => 'discoteca_club',
       p_what_for_whom => 'Conciertos', p_what_they_offer => 'Conciertos de grupos del barrio',
       p_address => 'Calle de Prueba 1', p_lng => -3.73, p_lat => 40.39) $$,
  $$ values (false) $$,
  'discoteca con invito: non segnalata'
);
reset role;
select is(
  (select o.entry_method::text from public.organizations o join public.memberships m on m.organization_id = o.id
   where m.user_id = '00000003-0000-4000-8000-000000000001'),
  'invite', 'discoteca con invito: entry_method invite'
);
select isnt(
  (select used_at from public.invites where token = 'token-de-prueba-valido'), null, 'l''invito risulta usato'
);

-- u4: discoteca senza invito; l'invito già usato non vale più ---------------
set local request.jwt.claims to '{"sub":"00000004-0000-4000-8000-000000000001","role":"authenticated"}';
set local role authenticated;
select throws_ok(
  $$ select public.register_entity('commercial', 'B97000045', 'Discoteca', 't1', 'p1', true,
       p_invite_token => 'token-de-prueba-valido', p_venue_activity => 'discoteca_club',
       p_what_for_whom => 'Conciertos', p_what_they_offer => 'Conciertos',
       p_address => 'Calle de Prueba 2', p_lng => -3.73, p_lat => 40.39) $$,
  'P0001', 'invalid_invite', 'un invito già usato non vale'
);
select results_eq(
  $$ select flagged from public.register_entity('commercial', 'B97000045', 'Discoteca', 't1', 'p1', true,
       p_venue_activity => 'discoteca_club', p_what_for_whom => 'Conciertos', p_what_they_offer => 'Conciertos',
       p_address => 'Calle de Prueba 2', p_lng => -3.73, p_lat => 40.39) $$,
  $$ values (true) $$,
  'discoteca senza invito: segnalata'
);
reset role;
select results_eq(
  $$ select o.entry_method::text, o.flagged_for_review from public.organizations o
     join public.memberships m on m.organization_id = o.id
     where m.user_id = '00000004-0000-4000-8000-000000000001' $$,
  $$ values ('self_declared', true) $$,
  'discoteca senza invito: self_declared e flagged_for_review'
);
select is(
  (select o.flag_reason::text from public.organizations o join public.memberships m on m.organization_id = o.id
   where m.user_id = '00000004-0000-4000-8000-000000000001'),
  'doubtful_activity', 'discoteca senza invito: motivo doubtful_activity'
);

-- u5: libreria senza invito ---------------------------------------------------
set local request.jwt.claims to '{"sub":"00000005-0000-4000-8000-000000000001","role":"authenticated"}';
set local role authenticated;
select results_eq(
  $$ select flagged from public.register_entity('commercial', 'B97000052', 'Librería', 't1', 'p1', true,
       p_venue_activity => 'libreria', p_what_for_whom => 'Libros para el barrio',
       p_what_they_offer => 'Presentaciones de libros',
       p_address => 'Calle de Prueba 3', p_lng => -3.73, p_lat => 40.39) $$,
  $$ values (false) $$,
  'libreria senza invito: non segnalata'
);

-- u6: venue senza attività o senza risposte -----------------------------------
reset role;
set local request.jwt.claims to '{"sub":"00000006-0000-4000-8000-000000000001","role":"authenticated"}';
set local role authenticated;
select throws_ok(
  $$ select public.register_entity('commercial', 'B97000060', 'Sin actividad', 't1', 'p1', true) $$,
  'P0001', 'venue_activity_required', 'venue senza attività: venue_activity_required'
);
select throws_ok(
  $$ select public.register_entity('commercial', 'B97000060', 'Sin respuestas', 't1', 'p1', true,
       p_venue_activity => 'galeria', p_what_for_whom => '  ') $$,
  'P0001', 'answers_required', 'venue senza risposte: answers_required'
);

-- u7: associazione senza risposte (facoltative) -------------------------------
reset role;
set local request.jwt.claims to '{"sub":"00000007-0000-4000-8000-000000000001","role":"authenticated"}';
set local role authenticated;
select lives_ok(
  $$ select public.register_entity('association', 'G97000078', 'Sin respuestas', 't1', 'p1', true) $$,
  'per le associazioni le risposte sono facoltative'
);

select * from finish();
rollback;
