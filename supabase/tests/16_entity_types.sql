-- Test 19 (sessione 5): forma giuridica all'iscrizione. Lettera del NIF per tipo, documenti personali,
-- NIF facoltativo solo per le attività commerciali, NIF riusabile solo per gli enti pubblici, avviso al
-- fondatore secondo la tabella di DATA_MODEL, entity_type e flag_reason privati, barrio dei professionisti.
begin;
create extension if not exists pgtap with schema extensions;
set local search_path = extensions, public;
select no_plan();

insert into auth.users (id, email) values
  ('00000001-0000-4000-8000-000000000016', 'e1@test.invalid'),
  ('00000002-0000-4000-8000-000000000016', 'e2@test.invalid'),
  ('00000003-0000-4000-8000-000000000016', 'e3@test.invalid'),
  ('00000004-0000-4000-8000-000000000016', 'e4@test.invalid'),
  ('00000005-0000-4000-8000-000000000016', 'e5@test.invalid'),
  ('00000006-0000-4000-8000-000000000016', 'e6@test.invalid'),
  ('00000007-0000-4000-8000-000000000016', 'e7@test.invalid'),
  ('00000008-0000-4000-8000-000000000016', 'e8@test.invalid'),
  ('0000000a-0000-4000-8000-000000000016', 'admin16@test.invalid');
insert into public.app_admins (user_id) values ('0000000a-0000-4000-8000-000000000016');
insert into public.municipal_associations (cif, name) values
  ('G96000010', 'ASOCIACION DEL ELENCO DIECISEIS'),
  ('F96000017', 'COOPERATIVA DEL ELENCO DIECISEIS');
-- Un'associazione attiva che invita.
insert into public.organizations (id, kind, name, entry_method) values
  ('a0000000-0000-4000-8000-000000000016', 'association', 'Anfitriona dieciséis', 'self_declared');
insert into public.invites (token, organization_id) values ('token-dieciseis', 'a0000000-0000-4000-8000-000000000016');

-- Helper e vincoli (come proprietario) ------------------------------------------
select results_eq(
  $$ select private.kind_for_entity_type(t)::text from unnest(enum_range(null::public.entity_type)) as t $$,
  $$ values ('association'), ('association'), ('association'), ('association'), ('venue'), ('professional') $$,
  'mappatura: association, foundation, cooperative, public_entity → association; commercial → venue; informal → professional'
);
select is(private.is_personal_nif('12345678Z') and private.is_personal_nif('X1234567L')
          and private.is_personal_nif('K1234567L'), true, 'DNI, NIE e K/L/M sono documenti personali');
select is(private.is_personal_nif('B96000014'), false, 'un NIF d''impresa non è personale');
select results_eq(
  $$ select private.nif_allowed_for('commercial', n) from unnest(array['A96000010', 'B96000014', 'E96000013', 'J96000011', 'G96000028', 'F96000017']) as n $$,
  $$ values (true), (true), (true), (true), (false), (false) $$,
  'attività commerciale: solo A, B, E, J'
);
select is(private.nif_allowed_for('informal', 'G96000028'), false, 'i gruppi informali non hanno NIF');
select throws_ok(
  $$ insert into public.organizations (kind, entity_type, name, entry_method)
     values ('venue', 'foundation', 'Incoherente', 'self_declared') $$,
  '23514', null, 'kind e entity_type devono corrispondere'
);
select is(
  (select entity_type::text from public.organizations where id = 'a0000000-0000-4000-8000-000000000016'),
  'association', 'un insert senza entity_type riceve il tipo di base del kind'
);

-- u1: fondazione ---------------------------------------------------------------
set local request.jwt.claims to '{"sub":"00000001-0000-4000-8000-000000000016","role":"authenticated"}';
set local role authenticated;
select throws_ok(
  $$ select public.register_entity('foundation', 'F96000025', 'Fundación Errónea', 't1', 'p1', true) $$,
  'P0001', 'invalid_nif', 'fondazione con NIF F: invalid_nif'
);
select throws_ok(
  $$ select public.register_entity('foundation', null, 'Fundación sin NIF', 't1', 'p1', true) $$,
  'P0001', 'nif_required', 'fondazione senza NIF: nif_required'
);
select results_eq(
  $$ select flagged, flag_reason::text
     from public.register_entity('foundation', 'G96000028', 'Fundación de Prueba', 't1', 'p1', true,
       p_what_for_whom => 'Cultura', p_how_sustained => 'Donaciones', p_what_they_offer => 'No se guarda') $$,
  $$ values (true, 'not_in_registry') $$,
  'fondazione fuori elenco: segnalata con not_in_registry'
);
reset role;
select results_eq(
  $$ select o.kind::text, o.entity_type::text, o.entry_method::text, o.verified, a.how_sustained, a.what_they_offer
     from public.organizations o
     join public.memberships m on m.organization_id = o.id
     join public.organization_answers a on a.organization_id = o.id
     where m.user_id = '00000001-0000-4000-8000-000000000016' $$,
  $$ values ('association', 'foundation', 'self_declared', false, 'Donaciones'::text, null::text) $$,
  'fondazione: kind association, risposte da associazione'
);

-- u2: cooperativa nell'elenco ----------------------------------------------------
set local request.jwt.claims to '{"sub":"00000002-0000-4000-8000-000000000016","role":"authenticated"}';
set local role authenticated;
select results_eq(
  $$ select flagged, flag_reason from public.register_entity('cooperative', 'F96000017', 'Cooperativa del Elenco', 't1', 'p1', true) $$,
  $$ values (false, null::public.flag_reason) $$,
  'cooperativa nell''elenco: non segnalata'
);
reset role;
select results_eq(
  $$ select o.entry_method::text, o.verified from public.organizations o
     join public.memberships m on m.organization_id = o.id
     where m.user_id = '00000002-0000-4000-8000-000000000016' $$,
  $$ values ('municipal_registry', true) $$,
  'cooperativa nell''elenco: municipal_registry e verificata'
);

-- u3, u4: enti pubblici con lo stesso NIF ------------------------------------------
set local request.jwt.claims to '{"sub":"00000003-0000-4000-8000-000000000016","role":"authenticated"}';
set local role authenticated;
select throws_ok(
  $$ select public.register_entity('public_entity', 'G96000036', 'Biblioteca Errónea', 't1', 'p1', true) $$,
  'P0001', 'invalid_nif', 'ente pubblico con NIF G: invalid_nif'
);
select results_eq(
  $$ select flagged, flag_reason::text from public.register_entity('public_entity', 'P9600001A', 'Biblioteca de Prueba', 't1', 'p1', true) $$,
  $$ values (true, 'public_entity') $$,
  'ente pubblico al primo uso del NIF: segnalato con public_entity'
);
reset role;
set local request.jwt.claims to '{"sub":"00000004-0000-4000-8000-000000000016","role":"authenticated"}';
set local role authenticated;
select results_eq(
  $$ select flagged, flag_reason::text from public.register_entity('public_entity', 'p-9600001-a', 'Centro Cultural de Prueba', 't1', 'p1', true) $$,
  $$ values (true, 'public_entity') $$,
  'un secondo ente pubblico usa lo stesso NIF ed è segnalato'
);
reset role;
select is((select count(*)::integer from public.organization_verifications where nif = 'P9600001A'), 2,
  'NIF P/Q/S riusabile: due verifiche');

-- u5: attività commerciale senza NIF ------------------------------------------------
set local request.jwt.claims to '{"sub":"00000005-0000-4000-8000-000000000016","role":"authenticated"}';
set local role authenticated;
select throws_ok(
  $$ select public.register_entity('commercial', '12345678Z', 'Bar con DNI', 't1', 'p1', true,
       p_venue_activity => 'cafe_cultural', p_what_for_whom => 'Un bar', p_what_they_offer => 'Conciertos',
       p_address => 'Calle 1', p_lng => -3.73, p_lat => 40.39) $$,
  'P0001', 'personal_nif', 'attività commerciale con DNI: personal_nif'
);
select throws_ok(
  $$ select public.register_entity('commercial', 'G96000044', 'Bar con NIF G', 't1', 'p1', true,
       p_venue_activity => 'cafe_cultural', p_what_for_whom => 'Un bar', p_what_they_offer => 'Conciertos',
       p_address => 'Calle 1', p_lng => -3.73, p_lat => 40.39) $$,
  'P0001', 'invalid_nif', 'attività commerciale con NIF G: invalid_nif'
);
select throws_ok(
  $$ select public.register_entity('commercial', null, 'Bar sin dirección', 't1', 'p1', true,
       p_venue_activity => 'cafe_cultural', p_what_for_whom => 'Un bar', p_what_they_offer => 'Conciertos') $$,
  'P0001', 'address_required', 'attività commerciale senza indirizzo: address_required'
);
select throws_ok(
  $$ select public.register_entity('commercial', null, 'Bar en el mar', 't1', 'p1', true,
       p_venue_activity => 'cafe_cultural', p_what_for_whom => 'Un bar', p_what_they_offer => 'Conciertos',
       p_address => 'Calle 1', p_lng => 2.0, p_lat => 39.0) $$,
  'P0001', 'invalid_location', 'punto fuori dalla Comunidad de Madrid: invalid_location'
);
select results_eq(
  $$ select flagged, flag_reason::text from public.register_entity('commercial', '  ', 'Bar de Barrio', 't1', 'p1', true,
       p_venue_activity => 'cafe_cultural', p_what_for_whom => 'Un bar de barrio', p_what_they_offer => 'Conciertos',
       p_how_sustained => 'No se guarda', p_contact_url => 'https://example.org/bar',
       p_address => 'Calle de Prueba 16', p_lng => -3.73, p_lat => 40.39) $$,
  $$ values (true, 'no_nif') $$,
  'attività commerciale senza NIF: segnalata con no_nif'
);
reset role;
select results_eq(
  $$ select o.kind::text, o.entity_type::text, o.contact_url, o.location is not null, a.what_they_offer, a.how_sustained
     from public.organizations o
     join public.memberships m on m.organization_id = o.id
     join public.organization_answers a on a.organization_id = o.id
     where m.user_id = '00000005-0000-4000-8000-000000000016' $$,
  $$ values ('venue', 'commercial', 'https://example.org/bar'::text, true, 'Conciertos'::text, null::text) $$,
  'attività commerciale: venue con punto, link e what_they_offer'
);
select is(
  (select count(*)::integer from public.organization_verifications ov
   join public.memberships m on m.organization_id = ov.organization_id
   where m.user_id = '00000005-0000-4000-8000-000000000016'),
  0, 'senza NIF nessuna verifica'
);

-- u6: attività commerciale con NIF E e attività tranquilla -----------------------------
set local request.jwt.claims to '{"sub":"00000006-0000-4000-8000-000000000016","role":"authenticated"}';
set local role authenticated;
select results_eq(
  $$ select flagged from public.register_entity('commercial', 'E96000013', 'Librería Comunidad de Bienes', 't1', 'p1', true,
       p_venue_activity => 'libreria', p_what_for_whom => 'Libros', p_what_they_offer => 'Presentaciones',
       p_address => 'Calle de Prueba 17', p_lng => -3.73, p_lat => 40.39) $$,
  $$ values (false) $$,
  'attività commerciale con NIF E e attività tranquilla: non segnalata'
);
reset role;

-- u7: NIF d'impresa già usato; con invito nessun avviso, anche senza NIF ---------------
set local request.jwt.claims to '{"sub":"00000007-0000-4000-8000-000000000016","role":"authenticated"}';
set local role authenticated;
select throws_ok(
  $$ select public.register_entity('commercial', 'E96000013', 'Copia', 't1', 'p1', true,
       p_venue_activity => 'libreria', p_what_for_whom => 'Libros', p_what_they_offer => 'Presentaciones',
       p_address => 'Calle 2', p_lng => -3.73, p_lat => 40.39) $$,
  'P0001', 'already_claimed', 'NIF d''impresa già usato: already_claimed'
);
select results_eq(
  $$ select flagged, flag_reason from public.register_entity('commercial', null, 'Bar Invitado', 't1', 'p1', true,
       p_invite_token => 'token-dieciseis', p_venue_activity => 'bar_nocturno', p_what_for_whom => 'Un bar',
       p_what_they_offer => 'Conciertos', p_address => 'Calle 3', p_lng => -3.73, p_lat => 40.39) $$,
  $$ values (false, null::public.flag_reason) $$,
  'con invito valido nessun avviso, anche senza NIF e con attività dubbia'
);
reset role;

-- entity_type e flag_reason sono privati ---------------------------------------------
set local role anon;
select throws_ok('select entity_type from public.organizations', '42501', null, 'anon: entity_type non è pubblico');
select throws_ok('select flag_reason from public.organizations', '42501', null, 'anon: flag_reason non è pubblico');
reset role;
set local request.jwt.claims to '{"sub":"00000005-0000-4000-8000-000000000016","role":"authenticated"}';
set local role authenticated;
select throws_ok(
  $$ update public.organizations set entity_type = 'association' where entity_type = 'commercial' $$,
  '42501', null, 'il membro non cambia entity_type'
);
select throws_ok(
  $$ update public.organizations set flag_reason = null where kind = 'venue' $$,
  '42501', null, 'il membro non cambia flag_reason'
);
-- Già segnalata per no_nif: passare a un'attività dubbia lascia il primo motivo.
select lives_ok(
  $$ update public.organizations set venue_activity = 'discoteca_club'
     where id = (select organization_id from public.memberships) $$,
  'il membro cambia attività'
);
reset role;
select is(
  (select o.flag_reason::text from public.organizations o join public.memberships m on m.organization_id = o.id
   where m.user_id = '00000005-0000-4000-8000-000000000016'),
  'no_nif', 'già segnalata: resta il primo motivo'
);

-- u6 passa a un'attività dubbia; il barrio scritto a mano si ricalcola dal punto --------
set local request.jwt.claims to '{"sub":"00000006-0000-4000-8000-000000000016","role":"authenticated"}';
set local role authenticated;
select lives_ok(
  $$ update public.organizations
     set venue_activity = 'bar_nocturno',
         neighborhood_id = (select n.id from public.neighborhoods n order by n.slug desc limit 1)
     where id = (select organization_id from public.memberships) $$,
  'il membro cambia attività e barrio'
);
reset role;
select results_eq(
  $$ select o.flagged_for_review, o.flag_reason::text,
            o.neighborhood_id is not distinct from private.neighborhood_for(o.location)
     from public.organizations o join public.memberships m on m.organization_id = o.id
     where m.user_id = '00000006-0000-4000-8000-000000000016' $$,
  $$ values (true, 'doubtful_activity', true) $$,
  'attività dubbia: segnalata con doubtful_activity; barrio sempre dal punto'
);

-- mark_reviewed azzera il motivo -------------------------------------------------
set local request.jwt.claims to '{"sub":"0000000a-0000-4000-8000-000000000016","role":"authenticated"}';
set local role authenticated;
select results_eq(
  $$ select entity_type::text, flag_reason::text from public.admin_review_list() where name = 'Bar de Barrio' $$,
  $$ values ('commercial', 'no_nif') $$,
  'admin_review_list mostra tipo e motivo'
);
select lives_ok(
  $$ select public.mark_reviewed(o.id) from public.admin_review_list() o where o.name = 'Bar de Barrio' $$,
  'mark_reviewed riesce'
);
reset role;
select results_eq(
  $$ select flagged_for_review, flag_reason from public.organizations where name = 'Bar de Barrio' $$,
  $$ values (false, null::public.flag_reason) $$,
  'mark_reviewed spegne avviso e motivo'
);

-- u8: Gente que hace cosas con barrio ----------------------------------------------
set local request.jwt.claims to '{"sub":"00000008-0000-4000-8000-000000000016","role":"authenticated"}';
set local role authenticated;
select throws_ok(
  $$ select public.create_professional('Colectivo', null, 't1', 'p1', true, p_neighborhood_slug => 'no-existe') $$,
  'P0001', 'invalid_neighborhood', 'barrio inesistente: invalid_neighborhood'
);
select lives_ok(
  $$ select public.create_professional('Colectivo de Prueba', 'Teatro de calle', 't1', 'p1', true,
       p_neighborhood_slug => (select n.slug from public.neighborhoods n order by n.slug limit 1),
       p_contact_url => 'https://example.org/colectivo', p_seeking_offering => 'Busco sala', p_indexable => false) $$,
  'create_professional con barrio e contatti'
);
reset role;
select results_eq(
  $$ select o.kind::text, o.entity_type::text, o.entry_method::text, n.slug, o.contact_url, o.seeking_offering, o.indexable
     from public.organizations o
     join public.memberships m on m.organization_id = o.id
     join public.neighborhoods n on n.id = o.neighborhood_id
     where m.user_id = '00000008-0000-4000-8000-000000000016' $$,
  $$ select 'professional', 'informal', 'email_only', (select n.slug from public.neighborhoods n order by n.slug limit 1),
            'https://example.org/colectivo'::text, 'Busco sala'::text, false $$,
  'professionista: informal, barrio scelto, contatti salvati'
);
-- Il professionista cambia barrio e il trigger non lo sovrascrive (non ha un punto).
set local request.jwt.claims to '{"sub":"00000008-0000-4000-8000-000000000016","role":"authenticated"}';
set local role authenticated;
select lives_ok(
  $$ update public.organizations
     set neighborhood_id = (select n.id from public.neighborhoods n order by n.slug desc limit 1)
     where id = (select organization_id from public.memberships) $$,
  'il professionista cambia barrio'
);
reset role;
select is(
  (select n.slug from public.organizations o
   join public.memberships m on m.organization_id = o.id
   join public.neighborhoods n on n.id = o.neighborhood_id
   where m.user_id = '00000008-0000-4000-8000-000000000016'),
  (select n.slug from public.neighborhoods n order by n.slug desc limit 1),
  'il barrio del professionista resta quello scelto'
);

select * from finish();
rollback;
