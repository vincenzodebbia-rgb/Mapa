-- Dati di demo: TUTTO INVENTATO. Nessuna persona né associazione reale (PRIVACY_AND_OWNERSHIP A.12).
-- Solo per locale, CI e mapa-dev: mai su mapa-prod.
-- Le date sono relative a now(): gli eventi settimanali tengono viva la mappa per circa 6 mesi.
-- Le organizzazioni non hanno membri: nessuno può modificarle dall'app.

-- Ora di Madrid: giorno di oggi + p_days, all'ora p_time.
create function pg_temp.madrid_at(p_days integer, p_time time)
returns timestamptz
language sql
stable
as $$
  select (date_trunc('day', now() at time zone 'Europe/Madrid') + p_days * interval '1 day' + p_time)
         at time zone 'Europe/Madrid';
$$;

create function pg_temp.point(p_lng double precision, p_lat double precision)
returns extensions.geography
language sql
immutable
as $$
  select extensions.st_setsrid(extensions.st_makepoint(p_lng, p_lat), 4326)::extensions.geography;
$$;

create function pg_temp.box(p_west double precision, p_south double precision, p_east double precision, p_north double precision)
returns extensions.geography
language sql
immutable
as $$
  select extensions.st_multi(extensions.st_makeenvelope(p_west, p_south, p_east, p_north, 4326))::extensions.geography;
$$;

-- Barrios: nomi reali (geografia pubblica), confini FINTI (rettangoli segnaposto).
-- scripts/import-neighborhoods.ts li sostituisce con i confini ufficiali.
insert into public.neighborhoods (slug, name, district, boundary, centroid) values
  ('vista-alegre', 'Vista Alegre', 'Carabanchel', pg_temp.box(-3.745, 40.380, -3.730, 40.392), pg_temp.point(-3.7375, 40.386)),
  ('opanel', 'Opañel', 'Carabanchel', pg_temp.box(-3.730, 40.383, -3.718, 40.393), pg_temp.point(-3.724, 40.388)),
  ('comillas', 'Comillas', 'Carabanchel', pg_temp.box(-3.718, 40.390, -3.708, 40.400), pg_temp.point(-3.713, 40.395)),
  ('embajadores', 'Embajadores', 'Centro', pg_temp.box(-3.708, 40.402, -3.695, 40.412), pg_temp.point(-3.7015, 40.407)),
  ('universidad', 'Universidad', 'Centro', pg_temp.box(-3.712, 40.422, -3.698, 40.432), pg_temp.point(-3.705, 40.427));

-- Elenco del Comune di prova: 5 NIF fittizi. I primi due sono già usati qui sotto,
-- gli altri tre servono a provare l'iscrizione "municipal_registry" su mapa-dev.
insert into public.municipal_associations (cif, name, registry_number, district, neighborhood, category) values
  ('G99000011', 'ASOCIACION VECINAL LA COLMENA (FICTICIA)', '90001', 'Carabanchel', 'Vista Alegre', 'Vecinales'),
  ('G99000029', 'ASOCIACION CULTURAL EL TENDEDERO (FICTICIA)', '90002', 'Carabanchel', 'Opañel', 'Culturales'),
  ('G99000037', 'ASOCIACION DE PRUEBA NUMERO TRES (FICTICIA)', '90003', 'Carabanchel', 'Comillas', 'Juveniles'),
  ('G99000045', 'ASOCIACION DE PRUEBA NUMERO CUATRO (FICTICIA)', '90004', 'Centro', 'Embajadores', 'Culturales'),
  ('G99000052', 'ASOCIACION DE PRUEBA NUMERO CINCO (FICTICIA)', '90005', 'Centro', 'Universidad', 'Deportivas');

-- Organizzazioni (tutte attive all'inizio: la sospensione è applicata in fondo).
insert into public.organizations
  (id, kind, name, one_liner, when_to_visit, contact_url, address, location, usual_category,
   seeking_offering, indexable, verified, entry_method, venue_activity, flagged_for_review)
values
  ('5eed0000-0000-4000-8000-0000000000a1', 'association', 'Colectivo Vecinal La Colmena (ficticio)',
   'Vecinos que se juntan para cuidar el barrio.', 'Los jueves a las 19h', 'https://example.org/colmena',
   'Calle Inventada 1', pg_temp.point(-3.738, 40.386), 'comunidad', null, true, true, 'municipal_registry', null, false),
  ('5eed0000-0000-4000-8000-0000000000a2', 'association', 'Asociación Cultural El Tendedero (ficticia)',
   'Música y teatro en un patio de vecinos.', 'Viernes por la tarde', null,
   'Calle de Prueba 22', pg_temp.point(-3.724, 40.388), 'musica', null, true, true, 'municipal_registry', null, false),
  ('5eed0000-0000-4000-8000-0000000000a3', 'association', 'Ateneo de Prueba Los Girasoles (ficticio)',
   'Charlas, libros y café.', null, null,
   'Plaza Imaginaria 3', pg_temp.point(-3.713, 40.395), 'encuentros', null, true, false, 'invite', null, false),
  ('5eed0000-0000-4000-8000-0000000000a4', 'association', 'Asociación Juvenil Patio Abierto (ficticia)',
   'Un local para jóvenes del barrio.', null, null,
   'Calle Ejemplo 4', pg_temp.point(-3.741, 40.389), 'comunidad', null, true, false, 'self_declared', null, false),
  ('5eed0000-0000-4000-8000-0000000000a5', 'association', 'Huerto Comunitario de Ensayo (ficticio)',
   'Huerto urbano abierto a quien quiera aprender.', 'Sábados por la mañana', null,
   'Calle Supuesta 5', pg_temp.point(-3.702, 40.407), 'talleres', null, true, false, 'self_declared', null, false),
  ('5eed0000-0000-4000-8000-0000000000a6', 'association', 'Asociación Suspendida de Ejemplo (ficticia)',
   'Ejemplo de entidad suspendida: no debe verse en público.', null, null,
   'Calle Oculta 6', pg_temp.point(-3.721, 40.385), 'otros', null, true, false, 'self_declared', null, false),
  ('5eed0000-0000-4000-8000-0000000000b1', 'venue', 'Librería Imaginaria Página Cero (ficticia)',
   'Librería pequeña con presentaciones.', 'De martes a sábado', 'https://example.org/pagina-cero',
   'Calle de los Libros Falsos 7', pg_temp.point(-3.711, 40.398), 'arte', null, true, false, 'self_declared', 'libreria', false),
  ('5eed0000-0000-4000-8000-0000000000b2', 'venue', 'Club Nocturno Inventado (ficticio)',
   'Ejemplo de espacio con actividad a revisar.', null, null,
   'Calle de la Noche Falsa 8', pg_temp.point(-3.699, 40.405), 'musica', null, true, false, 'self_declared', 'discoteca_club', true),
  ('5eed0000-0000-4000-8000-0000000000c1', 'professional', 'Colectivo Teatral de Mentira (ficticio)',
   'Teatro de calle itinerante.', null, 'https://example.org/teatro-de-mentira',
   null, null, 'teatro_danza', 'Busco salas pequeñas para ensayar', true, false, 'email_only', null, false),
  ('5eed0000-0000-4000-8000-0000000000c2', 'professional', 'Estudio de Ilustración Ficticio',
   'Ilustración y talleres de dibujo.', null, null,
   null, null, 'arte', 'Ofrezco talleres de dibujo para asociaciones', false, false, 'email_only', null, false);

insert into public.organization_verifications (organization_id, nif) values
  ('5eed0000-0000-4000-8000-0000000000a1', 'G99000011'),
  ('5eed0000-0000-4000-8000-0000000000a2', 'G99000029'),
  ('5eed0000-0000-4000-8000-0000000000a3', 'G99100018'),
  ('5eed0000-0000-4000-8000-0000000000a4', 'G99100026'),
  ('5eed0000-0000-4000-8000-0000000000a5', 'G99100034'),
  ('5eed0000-0000-4000-8000-0000000000a6', 'G99100042'),
  ('5eed0000-0000-4000-8000-0000000000b1', 'B99100050'),
  ('5eed0000-0000-4000-8000-0000000000b2', 'B99100068');

insert into public.organization_answers (organization_id, what_for_whom, how_sustained) values
  ('5eed0000-0000-4000-8000-0000000000a1', 'Actividades para vecinos de todas las edades.', null),
  ('5eed0000-0000-4000-8000-0000000000b1', 'Presentaciones de libros para el barrio.', 'Venta de libros.'),
  ('5eed0000-0000-4000-8000-0000000000b2', 'Conciertos y sesiones de baile.', 'Entradas y barra.');

-- La Colmena ha invitato il Ateneo.
insert into public.invites (organization_id, used_at, used_by_org) values
  ('5eed0000-0000-4000-8000-0000000000a1', now() - interval '20 days', '5eed0000-0000-4000-8000-0000000000a3');

-- Eventi settimanali: uno per ogni giorno della settimana, così ogni giorno c'è qualcosa "oggi".
insert into public.events
  (title, description, category, price_type, price_amount, starts_at, ends_at, recurrence, recurrence_until,
   venue_name, address, location, owner_org)
select
  w.title, w.description, w.category::public.event_category, 'free'::public.price_type, null::numeric,
  pg_temp.madrid_at(w.day_offset, w.starts::time),
  pg_temp.madrid_at(w.day_offset, w.ends::time),
  'weekly'::public.recurrence,
  ((now() at time zone 'Europe/Madrid')::date + interval '6 months' - interval '1 day')::date,
  w.venue_name, w.address, pg_temp.point(w.lng, w.lat), w.owner_org::uuid
from (values
  (0, 'Coro vecinal de prueba', 'Ensayo abierto: no hace falta saber cantar.', 'musica', '19:00', '21:00',
   null, 'Calle Inventada 1', -3.738, 40.386, '5eed0000-0000-4000-8000-0000000000a1'),
  (1, 'Taller de reparación de bicis', 'Trae tu bici y aprende a arreglarla.', 'talleres', '18:00', '20:00',
   null, 'Calle de Prueba 22', -3.724, 40.388, '5eed0000-0000-4000-8000-0000000000a2'),
  (2, 'Club de lectura en voz alta', 'Leemos juntos un capítulo cada semana.', 'encuentros', '19:30', '21:00',
   null, 'Plaza Imaginaria 3', -3.713, 40.395, '5eed0000-0000-4000-8000-0000000000a3'),
  (3, 'Huerto: tarde de riego', 'Riego y charla entre bancales.', 'comunidad', '18:30', '20:30',
   null, 'Calle Supuesta 5', -3.702, 40.407, '5eed0000-0000-4000-8000-0000000000a5'),
  (4, 'Lectura de poemas inventados', 'Micro abierto en la librería.', 'arte', '19:00', '20:30',
   null, 'Calle de los Libros Falsos 7', -3.711, 40.398, '5eed0000-0000-4000-8000-0000000000b1'),
  (5, 'Cine fórum de barrio', 'Película y debate.', 'encuentros', '20:00', '22:30',
   'Patio de la Colmena', 'Calle Inventada 1', -3.738, 40.386, '5eed0000-0000-4000-8000-0000000000a1'),
  (6, 'Baile en la plaza', 'Música para bailar al aire libre.', 'teatro_danza', '18:00', '21:00',
   'Plaza de ejemplo', 'Plaza Ficticia s/n', -3.726, 40.390, '5eed0000-0000-4000-8000-0000000000a2')
) as w(day_offset, title, description, category, starts, ends, venue_name, address, lng, lat, owner_org);

-- Eventi singoli, uno mensile e uno passato (archivio).
insert into public.events
  (title, description, category, price_type, price_amount, starts_at, ends_at, recurrence, recurrence_until,
   venue_name, address, location, owner_org)
values
  ('Concierto acústico en el patio', 'Tres grupos inventados.', 'musica', 'paid', 5.00,
   pg_temp.madrid_at(1, '20:00'), pg_temp.madrid_at(1, '22:00'), 'none', null,
   null, 'Calle de Prueba 22', pg_temp.point(-3.724, 40.388), '5eed0000-0000-4000-8000-0000000000a2'),
  ('Taller de serigrafía', 'Estampa tu propia camiseta.', 'talleres', 'donation', null,
   pg_temp.madrid_at(3, '11:00'), pg_temp.madrid_at(3, '13:00'), 'none', null,
   null, 'Calle Supuesta 5', pg_temp.point(-3.702, 40.407), '5eed0000-0000-4000-8000-0000000000a5'),
  ('Encuentro: cuidar el barrio', 'Charla abierta entre asociaciones.', 'encuentros', 'free', null,
   pg_temp.madrid_at(5, '18:30'), pg_temp.madrid_at(5, '20:30'), 'none', null,
   null, 'Plaza Imaginaria 3', pg_temp.point(-3.713, 40.395), '5eed0000-0000-4000-8000-0000000000a3'),
  -- Un professionista in un bar non registrato: il bar compare solo per questo evento.
  ('Micro abierto de teatro', 'Escenas cortas improvisadas.', 'teatro_danza', 'free', null,
   pg_temp.madrid_at(2, '21:00'), pg_temp.madrid_at(2, '23:30'), 'none', null,
   'Bar ficticio El Rincón', 'Calle Imaginaria del Centro 9', pg_temp.point(-3.705, 40.427), '5eed0000-0000-4000-8000-0000000000c1'),
  ('Presentación de un libro inventado', 'Con la autora (ficticia).', 'arte', 'free', null,
   pg_temp.madrid_at(4, '19:00'), pg_temp.madrid_at(4, '21:00'), 'none', null,
   null, 'Calle de los Libros Falsos 7', pg_temp.point(-3.711, 40.398), '5eed0000-0000-4000-8000-0000000000b1'),
  ('Mercadillo de trueque mensual', 'Cambia lo que no usas.', 'comunidad', 'free', null,
   pg_temp.madrid_at(6, '12:00'), pg_temp.madrid_at(6, '14:00'), 'monthly',
   ((now() at time zone 'Europe/Madrid')::date + interval '6 months' - interval '1 day')::date,
   null, 'Calle Supuesta 5', pg_temp.point(-3.702, 40.407), '5eed0000-0000-4000-8000-0000000000a5'),
  ('Fiesta de otoño (ya pasada)', 'Evento de archivo.', 'comunidad', 'free', null,
   pg_temp.madrid_at(-10, '19:00'), pg_temp.madrid_at(-10, '21:00'), 'none', null,
   null, 'Calle Inventada 1', pg_temp.point(-3.738, 40.386), '5eed0000-0000-4000-8000-0000000000a1'),
  ('Evento de una entidad suspendida', 'No debe verse en público.', 'otros', 'free', null,
   pg_temp.madrid_at(1, '19:00'), pg_temp.madrid_at(1, '21:00'), 'none', null,
   null, 'Calle Oculta 6', pg_temp.point(-3.721, 40.385), '5eed0000-0000-4000-8000-0000000000a6');

-- La Colmena co-organizza il concerto del Tendedero.
insert into public.event_organizers (event_id, organization_id, role)
select e.id, '5eed0000-0000-4000-8000-0000000000a1'::uuid, 'co'
from public.events e where e.title = 'Concierto acústico en el patio';

-- Fili: 5 confermati, 1 con l'entità sospesa (nascosto), 1 pending.
insert into public.threads (proposer_org, receiver_org, status, story_proposer, story_receiver, color_seed, confirmed_at) values
  ('5eed0000-0000-4000-8000-0000000000a1', '5eed0000-0000-4000-8000-0000000000a2', 'confirmed',
   'Nos prestaron el patio para el cine fórum.', 'Organizamos juntos las fiestas.', 0, now() - interval '40 days'),
  ('5eed0000-0000-4000-8000-0000000000a1', '5eed0000-0000-4000-8000-0000000000a3', 'confirmed',
   'Nos conocimos en una asamblea de barrio.', null, 1, now() - interval '19 days'),
  ('5eed0000-0000-4000-8000-0000000000a2', '5eed0000-0000-4000-8000-0000000000a5', 'confirmed',
   'Tocamos en la fiesta del huerto.', 'Nos regalaron plantones.', 2, now() - interval '30 days'),
  ('5eed0000-0000-4000-8000-0000000000a3', '5eed0000-0000-4000-8000-0000000000a5', 'confirmed',
   'Charla sobre compostaje.', null, 3, now() - interval '12 days'),
  ('5eed0000-0000-4000-8000-0000000000a2', '5eed0000-0000-4000-8000-0000000000a3', 'confirmed',
   'Intercambiamos libros y sillas.', 'Y una tarde de lectura.', 1, now() - interval '8 days'),
  ('5eed0000-0000-4000-8000-0000000000a6', '5eed0000-0000-4000-8000-0000000000a1', 'confirmed',
   'Hilo de una entidad suspendida: no debe verse.', null, 2, now() - interval '50 days');

insert into public.threads (proposer_org, receiver_org, story_proposer) values
  ('5eed0000-0000-4000-8000-0000000000a4', '5eed0000-0000-4000-8000-0000000000a1',
   'Queremos usar vuestro local para un taller.');

insert into public.spaces (organization_id, space_type, neighborhood_id, price_type, description, contact)
select '5eed0000-0000-4000-8000-0000000000a2'::uuid, 'sala'::public.space_type, n.id, 'free'::public.price_type,
       'Sala para ensayos, 20 personas.', 'Escribir a la web de la asociación.'
from public.neighborhoods n where n.slug = 'opanel';

insert into public.spaces (organization_id, space_type, neighborhood_id, price_type, description, contact)
select '5eed0000-0000-4000-8000-0000000000b1'::uuid, 'sala'::public.space_type, n.id, 'paid'::public.price_type,
       'Trastienda para presentaciones pequeñas.', 'Preguntar en la librería.'
from public.neighborhoods n where n.slug = 'comillas';

-- Stati finali: un'entità sospesa (con lo storico di moderazione) e una "faint" (inattiva da 120 giorni).
insert into public.moderation_actions (organization_id, organization_name, action, reason)
values ('5eed0000-0000-4000-8000-0000000000a6', 'Asociación Suspendida de Ejemplo (ficticia)', 'suspend',
        'Ejemplo de suspensión para la demo.');

update public.organizations set status = 'suspended'
where id = '5eed0000-0000-4000-8000-0000000000a6';

update public.organizations set last_activity_at = now() - interval '120 days'
where id = '5eed0000-0000-4000-8000-0000000000a4';
