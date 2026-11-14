-- Sessione 7 (docs/piani/sessione-7.md): Mi ficha e Mi cuenta.
-- Cambio di nome → slug nuovo, vecchio riservato e leggibile per il redirect; nessun'altra organizzazione lo prende;
-- ritorno al nome di prima; limite dei cambi; vecchi slug di una sospesa invisibili; nessuna scrittura diretta;
-- formato di contact_email; entity_type non modificabile; export_my_data con i vecchi slug;
-- delete_my_account elimina sempre la realtà (anche con un altro membro), eventi, risposte, verifica e vecchi slug.
-- Correzioni del 14 novembre: una sospesa non modifica scheda né risposte (anche nel database); update_my_profile salva
-- scheda e risposte in un'unica operazione (o tutto o niente).
begin;
create extension if not exists pgtap with schema extensions;
set local search_path = extensions, public;
select no_plan();

insert into auth.users (id, email) values
  ('0000000a-0000-4000-8000-000000000019', 'a@test.invalid'),
  ('0000000b-0000-4000-8000-000000000019', 'b@test.invalid'),
  ('0000000c-0000-4000-8000-000000000019', 'c@test.invalid'),
  ('0000000d-0000-4000-8000-000000000019', 'd@test.invalid'),
  ('0000000e-0000-4000-8000-000000000019', 'e@test.invalid');
insert into public.organizations (id, kind, name, entry_method, status) values
  ('a0000000-0000-4000-8000-000000000019', 'association', 'Prueba Uno Diecinueve', 'self_declared', 'active'),
  ('b0000000-0000-4000-8000-000000000019', 'association', 'Prueba Dos Diecinueve', 'self_declared', 'active'),
  ('c0000000-0000-4000-8000-000000000019', 'association', 'Prueba Tres Diecinueve', 'self_declared', 'active'),
  ('d0000000-0000-4000-8000-000000000019', 'association', 'Prueba Cuatro Diecinueve', 'self_declared', 'active');
insert into public.memberships (user_id, organization_id) values
  ('0000000a-0000-4000-8000-000000000019', 'a0000000-0000-4000-8000-000000000019'),
  ('0000000b-0000-4000-8000-000000000019', 'b0000000-0000-4000-8000-000000000019'),
  ('0000000c-0000-4000-8000-000000000019', 'c0000000-0000-4000-8000-000000000019'),
  ('0000000d-0000-4000-8000-000000000019', 'd0000000-0000-4000-8000-000000000019'),
  -- D ha un secondo membro: delete_my_account deve eliminare la realtà lo stesso.
  ('0000000e-0000-4000-8000-000000000019', 'd0000000-0000-4000-8000-000000000019');
insert into public.organization_answers (organization_id, what_for_whom) values
  ('d0000000-0000-4000-8000-000000000019', 'Respuesta privada'),
  ('b0000000-0000-4000-8000-000000000019', 'Respuesta de B'),
  ('c0000000-0000-4000-8000-000000000019', 'Respuesta de C');
insert into public.organization_verifications (organization_id, nif) values
  ('d0000000-0000-4000-8000-000000000019', 'G91000019');
insert into public.events (title, category, starts_at, ends_at, address, location, owner_org) values
  ('Evento de D', 'musica', now() + interval '2 days', now() + interval '2 days 1 hour', 'Calle',
   'SRID=4326;POINT(-3.70 40.41)', 'd0000000-0000-4000-8000-000000000019');
delete from public.rate_limits where key like 'db:org-slug:%-000000000019';

-- Cambio di nome e slug -------------------------------------------------------------------
set local request.jwt.claims to '{"sub":"0000000a-0000-4000-8000-000000000019","role":"authenticated"}';
set local role authenticated;
select lives_ok(
  $$ update public.organizations set name = 'Prueba Uno Renombrada' where id = 'a0000000-0000-4000-8000-000000000019' $$,
  'il membro cambia il nome'
);
select is((select slug from public.organizations where id = 'a0000000-0000-4000-8000-000000000019'),
  'prueba-uno-renombrada', 'lo slug segue il nome nuovo');
select results_eq(
  $$ select slug from public.organization_slugs where organization_id = 'a0000000-0000-4000-8000-000000000019' $$,
  $$ values ('prueba-uno-diecinueve'::text) $$,
  'il vecchio slug resta riservato'
);
select lives_ok(
  $$ update public.organizations set name = 'PRUEBA UNO Renombrada' where id = 'a0000000-0000-4000-8000-000000000019' $$,
  'cambia solo le maiuscole'
);
select is((select slug from public.organizations where id = 'a0000000-0000-4000-8000-000000000019'),
  'prueba-uno-renombrada', 'stesso slug se cambiano solo le maiuscole');
select throws_ok(
  $$ update public.organizations set slug = 'a-mano' where id = 'a0000000-0000-4000-8000-000000000019' $$,
  '42501', null, 'lo slug non si scrive a mano'
);
select throws_ok(
  $$ insert into public.organization_slugs (slug, organization_id) values ('occupato', 'a0000000-0000-4000-8000-000000000019') $$,
  '42501', null, 'nessuna scrittura diretta nei vecchi slug'
);
select throws_ok(
  $$ update public.organizations set entity_type = 'foundation' where id = 'a0000000-0000-4000-8000-000000000019' $$,
  '42501', null, 'il tipo di entità non si cambia'
);
reset role;

-- Un'altra organizzazione non prende il vecchio slug di A.
set local request.jwt.claims to '{"sub":"0000000b-0000-4000-8000-000000000019","role":"authenticated"}';
set local role authenticated;
select lives_ok(
  $$ update public.organizations set name = 'Prueba Uno Diecinueve' where id = 'b0000000-0000-4000-8000-000000000019' $$,
  'B prende il vecchio nome di A'
);
select isnt((select slug from public.organizations where id = 'b0000000-0000-4000-8000-000000000019'),
  'prueba-uno-diecinueve', 'ma non il vecchio slug di A');
reset role;

-- A torna al nome di prima e riprende il suo slug.
set local request.jwt.claims to '{"sub":"0000000a-0000-4000-8000-000000000019","role":"authenticated"}';
set local role authenticated;
select lives_ok(
  $$ update public.organizations set name = 'Prueba Uno Diecinueve' where id = 'a0000000-0000-4000-8000-000000000019' $$,
  'A torna al nome di prima'
);
select is((select slug from public.organizations where id = 'a0000000-0000-4000-8000-000000000019'),
  'prueba-uno-diecinueve', 'A riprende il suo slug');
select results_eq(
  $$ select slug from public.organization_slugs where organization_id = 'a0000000-0000-4000-8000-000000000019' $$,
  $$ values ('prueba-uno-renombrada'::text) $$,
  'lo slug lasciato va tra i vecchi'
);
reset role;

-- Limite: 5 cambi di slug ogni 30 giorni.
insert into public.rate_limits (key, window_start, count)
values ('db:org-slug:a0000000-0000-4000-8000-000000000019',
        to_timestamp(floor(extract(epoch from now()) / 2592000) * 2592000), 5)
on conflict (key, window_start) do update set count = 5;
set local request.jwt.claims to '{"sub":"0000000a-0000-4000-8000-000000000019","role":"authenticated"}';
set local role authenticated;
select throws_ok(
  $$ update public.organizations set name = 'Prueba Uno Otra Vez' where id = 'a0000000-0000-4000-8000-000000000019' $$,
  'P0001', 'rate_limited', 'oltre 5 cambi in 30 giorni: rate_limited'
);
select lives_ok(
  $$ update public.organizations set one_liner = 'Sigue funcionando' where id = 'a0000000-0000-4000-8000-000000000019' $$,
  'il limite vale solo per il nome'
);

-- B4: formato di contact_email.
select throws_ok(
  $$ update public.organizations set contact_email = 'x@y.es?bcc=otro@z.es' where id = 'a0000000-0000-4000-8000-000000000019' $$,
  '23514', null, 'un mailto con ? e & non si salva'
);
select lives_ok(
  $$ update public.organizations set contact_email = 'hola@asociacion-de-prueba.example' where id = 'a0000000-0000-4000-8000-000000000019' $$,
  'un''email normale si salva'
);

-- export_my_data contiene i vecchi slug.
select ok(
  (public.export_my_data() -> 'old_slugs') @> '[{"slug":"prueba-uno-renombrada"}]'::jsonb,
  'export_my_data contiene i vecchi slug'
);
reset role;

-- Vecchi slug visibili ad anon solo per organizzazioni attive.
update public.organizations set status = 'suspended' where id = 'b0000000-0000-4000-8000-000000000019';
set local request.jwt.claims to '{"role":"anon"}';
set local role anon;
select isnt_empty(
  $$ select 1 from public.organization_slugs where slug = 'prueba-uno-renombrada' $$,
  'anon legge il vecchio slug di un''organizzazione attiva (per il redirect)'
);
select is_empty(
  $$ select 1 from public.organization_slugs where organization_id = 'b0000000-0000-4000-8000-000000000019' $$,
  'anon non vede i vecchi slug di un''organizzazione sospesa'
);
reset role;

-- Sospesa: niente modifiche alla scheda né alle risposte, nemmeno nel database (correzione del 14 novembre) -------
set local request.jwt.claims to '{"sub":"0000000b-0000-4000-8000-000000000019","role":"authenticated"}';
set local role authenticated;
select throws_ok(
  $$ update public.organizations set one_liner = 'Cambio de una suspendida' where id = 'b0000000-0000-4000-8000-000000000019' $$,
  '42501', null, 'una sospesa non modifica la scheda'
);
select throws_ok(
  $$ update public.organization_answers set what_for_whom = 'Cambio' where organization_id = 'b0000000-0000-4000-8000-000000000019' $$,
  '42501', null, 'una sospesa non modifica le risposte'
);
select throws_ok(
  $$ select public.update_my_profile('Nombre de una suspendida') $$,
  '42501', null, 'una sospesa non salva nemmeno con update_my_profile'
);
select lives_ok($$ select public.export_my_data() $$, 'una sospesa scarica ancora i propri dati');
reset role;

-- update_my_profile: scheda e risposte insieme, o tutto o niente -----------------------------
set local request.jwt.claims to '{"sub":"0000000c-0000-4000-8000-000000000019","role":"authenticated"}';
set local role authenticated;
select throws_ok(
  $$ select public.update_my_profile('Prueba Tres Cambiada', p_what_for_whom => repeat('x', 501)) $$,
  '23514', null, 'una risposta troppo lunga fa fallire tutto il salvataggio'
);
select throws_ok(
  $$ select public.update_my_profile('Prueba Tres Cambiada', p_lng => -3.70) $$,
  'P0001', 'invalid_location', 'mezzo punto: invalid_location'
);
reset role;
select results_eq(
  $$ select o.name, o.slug, a.what_for_whom from public.organizations o
     join public.organization_answers a on a.organization_id = o.id
     where o.id = 'c0000000-0000-4000-8000-000000000019' $$,
  $$ values ('Prueba Tres Diecinueve'::text, 'prueba-tres-diecinueve'::text, 'Respuesta de C'::text) $$,
  'dopo un errore né il nome, né lo slug, né le risposte sono cambiati'
);
select is((select count(*)::integer from public.organization_slugs where organization_id = 'c0000000-0000-4000-8000-000000000019'), 0,
  'dopo un errore nessun vecchio slug');

set local request.jwt.claims to '{"sub":"0000000c-0000-4000-8000-000000000019","role":"authenticated"}';
set local role authenticated;
select is(
  public.update_my_profile('Prueba Tres Nueva', p_one_liner => 'Hacemos cosas', p_lng => -3.70, p_lat => 40.41,
    p_what_for_whom => 'Para el barrio', p_how_sustained => 'Cuotas', p_what_they_offer => 'No se guarda',
    p_venue_activity => 'discoteca_club'),
  'prueba-tres-nueva', 'update_my_profile salva e restituisce lo slug nuovo'
);
reset role;
select results_eq(
  $$ select o.one_liner, o.location is not null, o.venue_activity::text, a.what_for_whom, a.how_sustained, a.what_they_offer
     from public.organizations o join public.organization_answers a on a.organization_id = o.id
     where o.id = 'c0000000-0000-4000-8000-000000000019' $$,
  $$ values ('Hacemos cosas'::text, true, null::text, 'Para el barrio'::text, 'Cuotas'::text, null::text) $$,
  'scheda e risposte salvate insieme; i campi di un altro tipo non si scrivono'
);

-- delete_my_account: la realtà si elimina sempre, anche con un altro membro ------------------
update public.organizations set name = 'Prueba Cuatro Renombrada' where id = 'd0000000-0000-4000-8000-000000000019';
set local request.jwt.claims to '{"sub":"0000000d-0000-4000-8000-000000000019","role":"authenticated"}';
set local role authenticated;
select lives_ok($$ select public.delete_my_account() $$, 'delete_my_account');
reset role;
select is((select count(*)::integer from public.organizations where id = 'd0000000-0000-4000-8000-000000000019'), 0,
  'la realtà è eliminata anche con un altro membro');
select is((select count(*)::integer from public.events where owner_org = 'd0000000-0000-4000-8000-000000000019'), 0,
  'eventi eliminati');
select is((select count(*)::integer from public.organization_answers where organization_id = 'd0000000-0000-4000-8000-000000000019'), 0,
  'risposte eliminate');
select is((select count(*)::integer from public.organization_verifications where organization_id = 'd0000000-0000-4000-8000-000000000019'), 0,
  'NIF eliminato');
select is((select count(*)::integer from public.organization_slugs where organization_id = 'd0000000-0000-4000-8000-000000000019'), 0,
  'vecchi slug eliminati');
select is((select count(*)::integer from public.memberships where organization_id = 'd0000000-0000-4000-8000-000000000019'), 0,
  'nessuna membership resta');
select is((select count(*)::integer from auth.users where id = '0000000d-0000-4000-8000-000000000019'), 0,
  'utente eliminato');
select is((select count(*)::integer from auth.users where id = '0000000e-0000-4000-8000-000000000019'), 1,
  'l''altro membro resta come utente, senza realtà');

select * from finish();
rollback;
