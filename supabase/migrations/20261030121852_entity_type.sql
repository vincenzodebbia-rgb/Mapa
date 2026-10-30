-- Sessione 5 (docs/decisioni/2026-10-29-iscrizione.md): forma giuridica scelta all'iscrizione ("¿Qué sois?"),
-- motivo dell'avviso al fondatore, terza risposta delle attività commerciali, NIF riusabile per gli enti pubblici.
-- Le funzioni dell'iscrizione che usano tutto questo sono in registration_v2.

-- Enum ------------------------------------------------------------------------

create type public.entity_type as enum (
  'association', 'foundation', 'cooperative', 'public_entity', 'commercial', 'informal'
);
create type public.flag_reason as enum ('not_in_registry', 'public_entity', 'no_nif', 'doubtful_activity');

-- Helper ----------------------------------------------------------------------

-- Unico posto della mappatura forma giuridica → kind. Fondazioni, cooperative ed enti pubblici hanno
-- gli stessi diritti di un'associazione (fili, inviti, filtro "Asociaciones").
create function private.kind_for_entity_type(p_type public.entity_type)
returns public.org_kind
language sql
immutable
set search_path = ''
as $$
  select case p_type
    when 'commercial' then 'venue'::public.org_kind
    when 'informal' then 'professional'::public.org_kind
    when 'association' then 'association'::public.org_kind
    when 'foundation' then 'association'::public.org_kind
    when 'cooperative' then 'association'::public.org_kind
    when 'public_entity' then 'association'::public.org_kind
  end;
$$;

-- Documenti personali (DNI, NIE, NIF speciali K/L/M): si riconoscono per rifiutarli con un messaggio chiaro.
-- Mai salvati, da nessuna parte.
create function private.is_personal_nif(p_nif text)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select coalesce(p_nif ~ '^([0-9]{8}|[KLMXYZ][0-9]{7})[A-Z]$', false);
$$;

-- Lettera iniziale del NIF ammessa per ogni forma giuridica. I gruppi informali non hanno NIF.
create function private.nif_allowed_for(p_type public.entity_type, p_nif text)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select private.is_entity_nif(p_nif)
    and coalesce(case p_type
      when 'association' then p_nif ~ '^G'
      when 'foundation' then p_nif ~ '^G'
      when 'cooperative' then p_nif ~ '^F'
      when 'public_entity' then p_nif ~ '^[PQS]'
      when 'commercial' then p_nif ~ '^[ABEJ]'
      else false
    end, false);
$$;

-- organizations ---------------------------------------------------------------

alter table public.organizations
  add column entity_type public.entity_type,
  add column flag_reason public.flag_reason;

-- Le righe esistenti prendono il tipo di base del loro kind; quelle segnalate erano tutte espacios dubbi.
update public.organizations o
set entity_type = case o.kind
      when 'association' then 'association'::public.entity_type
      when 'venue' then 'commercial'::public.entity_type
      else 'informal'::public.entity_type
    end,
    flag_reason = case when o.flagged_for_review then 'doubtful_activity'::public.flag_reason end;

alter table public.organizations
  alter column entity_type set not null,
  add constraint organizations_entity_type_kind check (kind = private.kind_for_entity_type(entity_type)),
  -- Un motivo senza segnalazione non ha senso; il contrario è ammesso (righe inserite a mano prima di flag_reason).
  add constraint organizations_flag_reason check (flag_reason is null or flagged_for_review);

-- entity_type e flag_reason restano privati: nessuna grant select o update.
-- neighborhood_id diventa modificabile perché i professionisti scelgono il barrio; per gli altri lo ricalcola il trigger.
grant update (neighborhood_id) on table public.organizations to authenticated;

-- Stessa funzione del trigger (ultima versione: org_logo_story) con tre differenze:
-- 1. un insert diretto senza entity_type (seed, test) riceve il tipo di base del kind;
-- 2. per associazioni ed espacios il barrio si ricalcola dal punto a ogni scrittura, così un neighborhood_id
--    scritto a mano non resta; i professionisti non hanno un punto e tengono il barrio scelto;
-- 3. l'avviso acceso cambiando attività registra il suo motivo.
create or replace function private.organizations_before_write()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    new.slug := private.make_unique_slug(new.name, 'organizations');
    if new.entity_type is null then
      new.entity_type := case new.kind
        when 'association' then 'association'::public.entity_type
        when 'venue' then 'commercial'::public.entity_type
        else 'informal'::public.entity_type
      end;
    end if;
    if new.kind <> 'professional' then
      new.neighborhood_id := private.neighborhood_for(new.location);
    end if;
    return new;
  end if;

  if new.slug is distinct from old.slug then
    raise exception 'slug_immutable';
  end if;

  if new.kind <> 'professional' then
    -- Confronto in binario: l'uguaglianza di geography non è affidabile per questo scopo.
    if extensions.st_asbinary(new.location) is distinct from extensions.st_asbinary(old.location)
       or new.neighborhood_id is distinct from old.neighborhood_id then
      new.neighborhood_id := private.neighborhood_for(new.location);
    end if;
  end if;

  -- "Attività" = aggiornare la scheda. I cambi di stato fatti dagli admin non contano.
  if (new.name, new.one_liner, new.when_to_visit, new.contact_email, new.contact_phone, new.contact_url,
      new.address, extensions.st_asbinary(new.location), new.usual_category, new.seeking_offering,
      new.indexable, new.venue_activity, new.logo_path, new.story, new.neighborhood_id)
     is distinct from
     (old.name, old.one_liner, old.when_to_visit, old.contact_email, old.contact_phone, old.contact_url,
      old.address, extensions.st_asbinary(old.location), old.usual_category, old.seeking_offering,
      old.indexable, old.venue_activity, old.logo_path, old.story, old.neighborhood_id) then
    new.last_activity_at := now();
  end if;

  -- Passare a un'attività dubbia senza essere entrati con invito riaccende l'avviso.
  -- Non lo spegne mai: lo fa solo mark_reviewed(), così non si sfugge alla revisione cambiando attività.
  -- Se era già segnalata resta il primo motivo.
  if new.venue_activity is distinct from old.venue_activity
     and new.entry_method <> 'invite'
     and public.is_doubtful_activity(new.venue_activity)
     and not new.flagged_for_review then
    new.flagged_for_review := true;
    new.flag_reason := 'doubtful_activity';
  end if;

  new.updated_at := now();
  return new;
end;
$$;

-- organization_answers --------------------------------------------------------

-- "¿Qué ofrecéis a nivel cultural?" delle attività commerciali. how_sustained resta per le associazioni.
alter table public.organization_answers
  add column what_they_offer text check (char_length(what_they_offer) <= 500);

grant select (what_they_offer) on table public.organization_answers to authenticated;
grant update (what_they_offer) on table public.organization_answers to authenticated;

-- Gli espacios iscritti prima rispondevano in how_sustained alla domanda che ora è what_they_offer.
update public.organization_answers a
set what_they_offer = a.how_sustained, how_sustained = null
from public.organizations o
where o.id = a.organization_id and o.kind = 'venue' and a.what_they_offer is null;

-- organization_verifications --------------------------------------------------

-- Un NIF = un account, tranne gli enti pubblici: centri culturali e biblioteche municipali usano il NIF del Comune.
-- (Per questo ogni ente pubblico entra con avviso al fondatore: register_entity.)
alter table public.organization_verifications drop constraint organization_verifications_nif_key;
create unique index organization_verifications_nif_unique
  on public.organization_verifications (nif)
  where nif !~ '^[PQS]';
create index organization_verifications_nif_idx on public.organization_verifications (nif);
