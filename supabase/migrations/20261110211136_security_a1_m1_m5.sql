-- Correzioni di sicurezza A1, M1, M5 (docs/rapporti/sicurezza-2026-11.md).
-- A1: decisione del fondatore del 10 novembre (docs/decisioni/2026-11-10-verifica.md): nessun segno "verificada".
--     Il NIF nell'elenco del Comune resta un dato interno (entry_method = 'municipal_registry') e non dà più diritti.
-- M1: il limite di 20 eventi al giorno per organizzazione vale anche per gli insert diretti via API.
-- M5: register_entity e create_professional hanno un limite proprio nel database, anche chiamate via RPC.

-- Helper dei limiti -----------------------------------------------------------

-- Conta e, oltre il tetto, fallisce con 'rate_limited'. Attenzione: un'eccezione annulla tutta la transazione,
-- compreso il conteggio, quindi questi limiti contano solo le scritture riuscite (è il loro scopo: tetto alle righe
-- create). Per contare anche i tentativi falliti serve il limite dell'action, che resta.
create function private.assert_rate_limit(p_key text, p_max integer, p_window interval)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
begin
  if not public.check_rate_limit(p_key, p_max, p_window) then
    raise exception 'rate_limited';
  end if;
end;
$$;

revoke execute on function private.assert_rate_limit(text, integer, interval) from public, anon, authenticated;

-- A1: "verified" non è più pubblico e non lo dà più nessuno ----------------------

-- Nessuno lo legge dall'API: né anon né gli utenti. La colonna resta per la verifica futura (link all'email ufficiale
-- dell'associazione, quando ci sarà il servizio email del progetto).
revoke select (verified) on table public.organizations from anon, authenticated;

-- Chi era "verificada" solo perché il NIF era nell'elenco non lo è più. entry_method resta com'è (dato interno).
update public.organizations o set verified = false where o.verified;

comment on column public.organizations.verified is
  'Sempre false finché non esiste la verifica con l''email ufficiale (docs/decisioni/2026-11-10-verifica.md). '
  'Mai leggibile da anon/authenticated. Il NIF nell''elenco del Comune non la accende.';

-- M5 + A1: register_entity ------------------------------------------------------

-- Stessa firma e stesso tipo restituito della sessione 5: create or replace basta. Cambiano due cose:
-- verified non si accende più (resta il default false) e c'è il tetto delle nuove organizzazioni.
create or replace function public.register_entity(
  p_entity_type public.entity_type,
  p_nif text,
  p_name text,
  p_terms_version text,
  p_privacy_version text,
  p_age_confirmed boolean,
  p_invite_token text default null,
  p_venue_activity public.venue_activity default null,
  p_what_for_whom text default null,
  p_how_sustained text default null,
  p_what_they_offer text default null,
  p_one_liner text default null,
  p_when_to_visit text default null,
  p_contact_email text default null,
  p_contact_phone text default null,
  p_contact_url text default null,
  p_usual_category public.event_category default null,
  p_address text default null,
  p_lng double precision default null,
  p_lat double precision default null
)
returns table (slug text, flagged boolean, flag_reason public.flag_reason)
language plpgsql
volatile
security definer
set search_path = ''
as $$
#variable_conflict use_column
declare
  v_uid uuid := auth.uid();
  v_kind public.org_kind := private.kind_for_entity_type(p_entity_type);
  v_nif text := nullif(private.normalize_nif(p_nif), '');
  v_name text := btrim(coalesce(p_name, ''));
  v_what text := nullif(btrim(coalesce(p_what_for_whom, '')), '');
  v_how text := nullif(btrim(coalesce(p_how_sustained, '')), '');
  v_offer text := nullif(btrim(coalesce(p_what_they_offer, '')), '');
  v_address text := nullif(btrim(coalesce(p_address, '')), '');
  v_location extensions.geography;
  v_invite_id uuid;
  v_entry public.entry_method;
  v_reason public.flag_reason;
  v_org_id uuid;
  v_slug text;
begin
  if v_uid is null then
    raise exception 'not_authenticated';
  end if;
  -- I gruppi informali passano da create_professional.
  if v_kind is null or v_kind not in ('association', 'venue') then
    raise exception 'invalid_kind';
  end if;
  if exists (select 1 from public.memberships m where m.user_id = v_uid) then
    raise exception 'already_member';
  end if;
  -- M5: una organizzazione per account c'è già; il tetto vale per tutte le nuove organizzazioni insieme, così un
  -- robot con molti account (link magici senza Turnstile, M2) non crea centinaia di schede in un'ora.
  -- Chiave fissa, nessun dato personale. Stesso tetto e stessa chiave di create_professional.
  perform private.assert_rate_limit('db:new-organizations', 60, interval '1 hour');
  perform private.assert_terms(p_terms_version, p_privacy_version, p_age_confirmed);
  if char_length(v_name) not between 1 and 120 then
    raise exception 'invalid_name';
  end if;

  -- NIF: mai documenti personali; obbligatorio tranne per le attività commerciali; lettera giusta per il tipo.
  if private.is_personal_nif(v_nif) then
    raise exception 'personal_nif';
  end if;
  if v_nif is null and p_entity_type <> 'commercial' then
    raise exception 'nif_required';
  end if;
  if v_nif is not null and not private.nif_allowed_for(p_entity_type, v_nif) then
    raise exception 'invalid_nif';
  end if;
  -- Gli enti pubblici possono condividere il NIF (quello del Comune): lo dice l'indice unico parziale.
  if v_nif is not null and p_entity_type <> 'public_entity'
     and exists (select 1 from public.organization_verifications ov where ov.nif = v_nif) then
    raise exception 'already_claimed';
  end if;

  -- Attività commerciale: attività, due risposte e un luogo obbligatori. Per le associazioni le risposte sono facoltative.
  if v_kind = 'venue' then
    if p_venue_activity is null then
      raise exception 'venue_activity_required';
    end if;
    if v_what is null or v_offer is null then
      raise exception 'answers_required';
    end if;
  end if;
  if char_length(v_what) > 500 or char_length(v_how) > 500 or char_length(v_offer) > 500 then
    raise exception 'answer_too_long';
  end if;
  v_location := private.make_org_point(p_lng, p_lat);
  if v_kind = 'venue' and (v_address is null or v_location is null) then
    raise exception 'address_required';
  end if;

  if p_invite_token is not null then
    v_invite_id := private.lock_valid_invite(p_invite_token);
    if v_invite_id is null then
      raise exception 'invalid_invite';
    end if;
  end if;

  if v_invite_id is not null then
    -- Un invito valido fa sempre entrare senza avviso, qualunque tipo.
    v_entry := 'invite';
  elsif p_entity_type in ('association', 'foundation', 'cooperative')
        and exists (select 1 from public.municipal_associations ma where ma.cif = v_nif) then
    -- Solo un dato interno per la revisione: nessun segno pubblico, nessun diritto in più (A1).
    v_entry := 'municipal_registry';
  else
    v_entry := 'self_declared';
    v_reason := case
      when p_entity_type in ('association', 'foundation', 'cooperative') then 'not_in_registry'::public.flag_reason
      -- Sempre: il NIF di un ente pubblico è pubblico, quindi non prova niente.
      when p_entity_type = 'public_entity' then 'public_entity'::public.flag_reason
      when v_nif is null then 'no_nif'::public.flag_reason
      when public.is_doubtful_activity(p_venue_activity) then 'doubtful_activity'::public.flag_reason
    end;
  end if;

  -- verified non si scrive: resta false (A1).
  insert into public.organizations as o (
    kind, entity_type, name, one_liner, when_to_visit, contact_email, contact_phone, contact_url,
    usual_category, address, location, entry_method, venue_activity, flagged_for_review, flag_reason
  )
  values (
    v_kind,
    p_entity_type,
    v_name,
    nullif(btrim(coalesce(p_one_liner, '')), ''),
    nullif(btrim(coalesce(p_when_to_visit, '')), ''),
    nullif(btrim(coalesce(p_contact_email, '')), ''),
    nullif(btrim(coalesce(p_contact_phone, '')), ''),
    nullif(btrim(coalesce(p_contact_url, '')), ''),
    p_usual_category,
    v_address,
    v_location,
    v_entry,
    case when v_kind = 'venue' then p_venue_activity end,
    v_reason is not null,
    v_reason
  )
  returning o.id, o.slug into v_org_id, v_slug;

  if v_nif is not null then
    begin
      insert into public.organization_verifications (organization_id, nif) values (v_org_id, v_nif);
    exception when unique_violation then
      -- Due iscrizioni contemporanee con lo stesso NIF: vince la prima.
      raise exception 'already_claimed';
    end;
  end if;

  insert into public.memberships (user_id, organization_id) values (v_uid, v_org_id);
  insert into public.terms_acceptances (user_id, terms_version, privacy_version, age_confirmed)
  values (v_uid, btrim(p_terms_version), btrim(p_privacy_version), true);
  -- Ogni tipo salva solo le sue domande.
  insert into public.organization_answers (organization_id, what_for_whom, how_sustained, what_they_offer)
  values (
    v_org_id,
    v_what,
    case when v_kind = 'association' then v_how end,
    case when v_kind = 'venue' then v_offer end
  );

  if v_invite_id is not null then
    update public.invites i set used_at = now(), used_by_org = v_org_id where i.id = v_invite_id;
  end if;

  return query select v_slug, v_reason is not null, v_reason;
end;
$$;

-- M5: create_professional -------------------------------------------------------

create or replace function public.create_professional(
  p_name text,
  p_one_liner text,
  p_terms_version text,
  p_privacy_version text,
  p_age_confirmed boolean,
  p_invite_token text default null,
  p_neighborhood_slug text default null,
  p_contact_email text default null,
  p_contact_phone text default null,
  p_contact_url text default null,
  p_seeking_offering text default null,
  p_indexable boolean default true
)
returns text
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_name text := btrim(coalesce(p_name, ''));
  v_one_liner text := nullif(btrim(coalesce(p_one_liner, '')), '');
  v_neighborhood_slug text := nullif(btrim(coalesce(p_neighborhood_slug, '')), '');
  v_neighborhood_id uuid;
  v_invite_id uuid;
  v_org_id uuid;
  v_slug text;
begin
  if v_uid is null then
    raise exception 'not_authenticated';
  end if;
  if exists (select 1 from public.memberships m where m.user_id = v_uid) then
    raise exception 'already_member';
  end if;
  -- M5: stesso tetto (e stessa chiave) di register_entity.
  perform private.assert_rate_limit('db:new-organizations', 60, interval '1 hour');
  perform private.assert_terms(p_terms_version, p_privacy_version, p_age_confirmed);
  if char_length(v_name) not between 1 and 120 then
    raise exception 'invalid_name';
  end if;
  if char_length(v_one_liner) > 120 then
    raise exception 'invalid_one_liner';
  end if;
  if v_neighborhood_slug is not null then
    select n.id into v_neighborhood_id from public.neighborhoods n where n.slug = v_neighborhood_slug;
    if v_neighborhood_id is null then
      raise exception 'invalid_neighborhood';
    end if;
  end if;

  if p_invite_token is not null then
    v_invite_id := private.lock_valid_invite(p_invite_token);
    if v_invite_id is null then
      raise exception 'invalid_invite';
    end if;
  end if;

  insert into public.organizations as o (
    kind, entity_type, name, one_liner, neighborhood_id, contact_email, contact_phone, contact_url,
    seeking_offering, indexable, entry_method
  )
  values (
    'professional',
    'informal',
    v_name,
    v_one_liner,
    v_neighborhood_id,
    nullif(btrim(coalesce(p_contact_email, '')), ''),
    nullif(btrim(coalesce(p_contact_phone, '')), ''),
    nullif(btrim(coalesce(p_contact_url, '')), ''),
    nullif(btrim(coalesce(p_seeking_offering, '')), ''),
    coalesce(p_indexable, true),
    case when v_invite_id is not null then 'invite'::public.entry_method else 'email_only'::public.entry_method end
  )
  returning o.id, o.slug into v_org_id, v_slug;

  insert into public.memberships (user_id, organization_id) values (v_uid, v_org_id);
  insert into public.terms_acceptances (user_id, terms_version, privacy_version, age_confirmed)
  values (v_uid, btrim(p_terms_version), btrim(p_privacy_version), true);

  if v_invite_id is not null then
    update public.invites i set used_at = now(), used_by_org = v_org_id where i.id = v_invite_id;
  end if;

  return v_slug;
end;
$$;

-- M1: tetto degli eventi nel database ---------------------------------------------

-- Ogni insert in events fatto da un utente (anche diretto via /rest/v1/events) conta per l'organizzazione proprietaria:
-- al massimo 20 al giorno (finestra UTC, come check_rate_limit). Chiave diversa da quella dell'action ('event:id:...'),
-- così i due contatori non si sommano. Senza utente (seed, migrazioni, service_role) non si conta.
-- Un insert rifiutato dalla RLS annulla anche il conteggio: nessuno consuma il limite di un'altra organizzazione.
create function private.events_rate_limit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is not null then
    perform private.assert_rate_limit('db:event:' || new.owner_org::text, 20, interval '1 day');
  end if;
  return new;
end;
$$;

revoke execute on function private.events_rate_limit() from public, anon, authenticated;

create trigger events_rate_limit
  before insert on public.events
  for each row execute function private.events_rate_limit();

comment on policy events_insert_members on public.events is
  'Il tetto di 20 eventi al giorno per organizzazione lo applica il trigger events_rate_limit (M1).';
