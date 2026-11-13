-- Sessione 6 (docs/decisioni/2026-11-13-eventi.md): scritture degli eventi da parte di un membro.
-- D4: niente eventi già finiti, nemmeno con un insert diretto; un evento in corso sì; la descrizione di un evento
--     passato resta modificabile; una serie si giudica dalla data di fine.
-- D5: un evento può passare la mezzanotte (massimo 24 ore, fine dopo l'inizio).
-- D7: nessun co-organizzatore via API.
-- In più: un membro non cambia owner_org né slug del proprio evento.
begin;
create extension if not exists pgtap with schema extensions;
set local search_path = extensions, public;
select no_plan();

insert into auth.users (id, email) values
  ('0000000a-0000-4000-8000-000000000018', 'a@test.invalid'),
  ('0000000b-0000-4000-8000-000000000018', 'b@test.invalid');
insert into public.organizations (id, kind, name, entry_method) values
  ('a0000000-0000-4000-8000-000000000018', 'association', 'Prueba A 18', 'self_declared'),
  ('b0000000-0000-4000-8000-000000000018', 'association', 'Prueba B 18', 'self_declared');
insert into public.memberships (user_id, organization_id) values
  ('0000000a-0000-4000-8000-000000000018', 'a0000000-0000-4000-8000-000000000018'),
  ('0000000b-0000-4000-8000-000000000018', 'b0000000-0000-4000-8000-000000000018');
-- Evento passato di A, inserito senza utente (come la seed).
insert into public.events (id, title, category, starts_at, ends_at, address, location, owner_org) values
  ('e000000a-0000-4000-8000-000000000018', 'Pasado', 'musica', now() - interval '3 days',
   now() - interval '3 days' + interval '2 hours', 'Calle Test 1', 'SRID=4326;POINT(-3.70 40.41)',
   'a0000000-0000-4000-8000-000000000018');
-- Serie settimanale di A iniziata due settimane fa, ancora in corso.
insert into public.events (id, title, category, starts_at, ends_at, recurrence, recurrence_until, address, location, owner_org)
values
  ('e000000c-0000-4000-8000-000000000018', 'Serie', 'musica', now() - interval '14 days',
   now() - interval '14 days' + interval '2 hours', 'weekly', ((now() at time zone 'Europe/Madrid')::date + 30),
   'Calle Test 1', 'SRID=4326;POINT(-3.70 40.41)', 'a0000000-0000-4000-8000-000000000018');
-- Riga co della seed (inserita senza utente): B co-organizza l'evento passato di A.
insert into public.event_organizers (event_id, organization_id, role) values
  ('e000000a-0000-4000-8000-000000000018', 'b0000000-0000-4000-8000-000000000018', 'co');
-- Il limite M1 non deve interferire.
delete from public.rate_limits where key like 'db:event:%-000000000018';

set local request.jwt.claims to '{"sub":"0000000a-0000-4000-8000-000000000018","role":"authenticated"}';
set local role authenticated;

-- D4 ------------------------------------------------------------------------------
select throws_ok(
  $$ insert into public.events (title, category, starts_at, ends_at, address, location, owner_org)
     values ('Ayer', 'musica', now() - interval '1 day', now() - interval '22 hours', 'Calle',
             'SRID=4326;POINT(-3.70 40.41)', 'a0000000-0000-4000-8000-000000000018') $$,
  'P0001', 'event_in_past', 'un evento già finito non si crea, nemmeno con un insert diretto'
);
select lives_ok(
  $$ insert into public.events (title, category, starts_at, ends_at, address, location, owner_org)
     values ('En curso', 'musica', now() - interval '2 hours', now() + interval '2 hours', 'Calle',
             'SRID=4326;POINT(-3.70 40.41)', 'a0000000-0000-4000-8000-000000000018') $$,
  'un evento in corso si può pubblicare'
);
select lives_ok(
  $$ update public.events set description = 'Fotos del día' where id = 'e000000a-0000-4000-8000-000000000018' $$,
  'la descrizione di un evento passato si può cambiare'
);
select throws_ok(
  $$ update public.events set starts_at = now() - interval '2 days', ends_at = now() - interval '2 days' + interval '1 hour'
     where id = 'e000000a-0000-4000-8000-000000000018' $$,
  'P0001', 'event_in_past', 'spostare un evento nel passato non si può'
);
select lives_ok(
  $$ update public.events set ends_at = starts_at + interval '3 hours' where id = 'e000000c-0000-4000-8000-000000000018' $$,
  'una serie ancora in corso cambia orario anche se la prima data è passata'
);
select throws_ok(
  $$ update public.events set recurrence_until = (starts_at at time zone 'Europe/Madrid')::date + 7
     where id = 'e000000c-0000-4000-8000-000000000018' $$,
  'P0001', 'event_in_past', 'una serie non si chiude nel passato'
);

-- D5 ------------------------------------------------------------------------------
select lives_ok(
  $$ insert into public.events (title, category, starts_at, ends_at, address, location, owner_org)
     values ('Noche', 'musica', (current_date + 1) + time '22:00', (current_date + 2) + time '04:00', 'Calle',
             'SRID=4326;POINT(-3.70 40.41)', 'a0000000-0000-4000-8000-000000000018') $$,
  'un evento può finire dopo mezzanotte'
);
select throws_ok(
  $$ insert into public.events (title, category, starts_at, ends_at, address, location, owner_org)
     values ('Maratón', 'musica', now() + interval '1 day', now() + interval '2 days 1 minute', 'Calle',
             'SRID=4326;POINT(-3.70 40.41)', 'a0000000-0000-4000-8000-000000000018') $$,
  '23514', null, 'più di 24 ore no'
);
select throws_ok(
  $$ insert into public.events (title, category, starts_at, ends_at, address, location, owner_org)
     values ('Al revés', 'musica', now() + interval '2 days', now() + interval '1 day', 'Calle',
             'SRID=4326;POINT(-3.70 40.41)', 'a0000000-0000-4000-8000-000000000018') $$,
  '23514', null, 'la fine prima dell''inizio no'
);

-- Identità dell'evento ------------------------------------------------------------
select throws_ok(
  $$ update public.events set owner_org = 'b0000000-0000-4000-8000-000000000018'
     where id = 'e000000c-0000-4000-8000-000000000018' $$,
  '42501', null, 'il membro non cambia owner_org'
);
select throws_ok(
  $$ update public.events set slug = 'otro' where id = 'e000000c-0000-4000-8000-000000000018' $$,
  '42501', null, 'il membro non cambia slug'
);

-- D7 ------------------------------------------------------------------------------
select throws_ok(
  $$ insert into public.event_organizers (event_id, organization_id, role)
     values ('e000000c-0000-4000-8000-000000000018', 'b0000000-0000-4000-8000-000000000018', 'co') $$,
  '42501', null, 'nessun co-organizzatore via API'
);
select is(
  (select count(*)::integer from public.event_organizers eo
   join public.events e on e.id = eo.event_id
   where e.title in ('En curso', 'Noche') and eo.role = 'owner'),
  2, 'la riga owner arriva comunque dal trigger'
);
reset role;

-- Il co-organizzatore di una riga esistente si può ancora togliere.
set local request.jwt.claims to '{"sub":"0000000b-0000-4000-8000-000000000018","role":"authenticated"}';
set local role authenticated;
select lives_ok(
  $$ delete from public.event_organizers
     where event_id = 'e000000a-0000-4000-8000-000000000018' and organization_id = 'b0000000-0000-4000-8000-000000000018' $$,
  'un co-organizzatore esistente si toglie da solo'
);
reset role;
select is(
  (select count(*)::integer from public.event_organizers
   where event_id = 'e000000a-0000-4000-8000-000000000018' and role = 'co'),
  0, 'la riga co è sparita'
);

select * from finish();
rollback;
