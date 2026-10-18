-- Test 7: event_occurrences tiene le 19:00 locali attraverso l'ultima domenica di marzo e di ottobre;
-- il mensile dal 31 non deriva.
begin;
create extension if not exists pgtap with schema extensions;
set local search_path = extensions, public;
select no_plan();

insert into public.organizations (id, kind, name, entry_method) values
  ('a0000000-0000-4000-8000-000000000001', 'association', 'Prueba A', 'self_declared');

-- Cambi d'ora 2027: domenica 28 marzo e domenica 31 ottobre.
insert into public.events (id, title, category, starts_at, ends_at, recurrence, recurrence_until, address, location, owner_org) values
  ('e0000000-0000-4000-8000-000000000001', 'Semanal marzo', 'musica',
   '2027-03-21 19:00 Europe/Madrid', '2027-03-21 21:00 Europe/Madrid', 'weekly', '2027-04-11',
   'Calle Test 1', 'SRID=4326;POINT(-3.70 40.41)', 'a0000000-0000-4000-8000-000000000001'),
  ('e0000000-0000-4000-8000-000000000002', 'Semanal octubre', 'musica',
   '2027-10-24 19:00 Europe/Madrid', '2027-10-24 21:00 Europe/Madrid', 'weekly', '2027-11-07',
   'Calle Test 1', 'SRID=4326;POINT(-3.70 40.41)', 'a0000000-0000-4000-8000-000000000001'),
  ('e0000000-0000-4000-8000-000000000003', 'Mensual desde el 31', 'musica',
   '2027-01-31 19:00 Europe/Madrid', '2027-01-31 21:00 Europe/Madrid', 'monthly', '2027-06-30',
   'Calle Test 1', 'SRID=4326;POINT(-3.70 40.41)', 'a0000000-0000-4000-8000-000000000001'),
  ('e0000000-0000-4000-8000-000000000004', 'Único', 'musica',
   '2027-03-28 19:00 Europe/Madrid', '2027-03-28 21:00 Europe/Madrid', 'none', null,
   'Calle Test 1', 'SRID=4326;POINT(-3.70 40.41)', 'a0000000-0000-4000-8000-000000000001');

select results_eq(
  $$ select (occ_start at time zone 'Europe/Madrid')::text, (occ_end at time zone 'Europe/Madrid')::text
     from public.event_occurrences('2027-01-01', '2028-01-01')
     where event_id = 'e0000000-0000-4000-8000-000000000001' order by occ_start $$,
  $$ values ('2027-03-21 19:00:00', '2027-03-21 21:00:00'),
            ('2027-03-28 19:00:00', '2027-03-28 21:00:00'),
            ('2027-04-04 19:00:00', '2027-04-04 21:00:00'),
            ('2027-04-11 19:00:00', '2027-04-11 21:00:00') $$,
  'settimanale: sempre 19:00-21:00 locali attraverso il cambio d''ora di marzo'
);

select results_eq(
  $$ select (occ_start at time zone 'Europe/Madrid')::text
     from public.event_occurrences('2027-01-01', '2028-01-01')
     where event_id = 'e0000000-0000-4000-8000-000000000002' order by occ_start $$,
  $$ values ('2027-10-24 19:00:00'), ('2027-10-31 19:00:00'), ('2027-11-07 19:00:00') $$,
  'settimanale: sempre 19:00 locali attraverso il cambio d''ora di ottobre'
);

select results_eq(
  $$ select (occ_start at time zone 'Europe/Madrid')::text
     from public.event_occurrences('2027-01-01', '2028-01-01')
     where event_id = 'e0000000-0000-4000-8000-000000000003' order by occ_start $$,
  $$ values ('2027-01-31 19:00:00'), ('2027-02-28 19:00:00'), ('2027-03-31 19:00:00'),
            ('2027-04-30 19:00:00'), ('2027-05-31 19:00:00'), ('2027-06-30 19:00:00') $$,
  'mensile dal 31: torna al 31 quando il mese lo ha, nessuna deriva'
);

select is(
  (select count(*)::integer from public.event_occurrences('2027-03-28', '2027-03-29')
   where event_id in ('e0000000-0000-4000-8000-000000000001', 'e0000000-0000-4000-8000-000000000004')),
  2, 'la finestra filtra le occorrenze (un settimanale e un evento singolo)'
);

select throws_ok(
  $$ insert into public.events (title, category, starts_at, ends_at, recurrence, recurrence_until, address, location, owner_org)
     values ('Demasiado largo', 'musica', '2027-01-01 19:00 Europe/Madrid', '2027-01-01 21:00 Europe/Madrid',
             'weekly', '2027-08-01', 'Calle', 'SRID=4326;POINT(-3.70 40.41)', 'a0000000-0000-4000-8000-000000000001') $$,
  '23514', null, 'una ripetizione oltre 6 mesi viene rifiutata'
);

select * from finish();
rollback;
