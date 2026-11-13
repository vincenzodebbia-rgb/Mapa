-- Sessione 5 (docs/decisioni/2026-10-29-iscrizione.md): funzioni dell'iscrizione con la forma giuridica.
-- Cambiano le firme di register_entity e create_professional e le colonne di admin_review_list:
-- si tolgono le vecchie e si creano le nuove (create or replace non può cambiare firma né tipo restituito).

drop function public.register_entity(
  public.org_kind, text, text, text, text, boolean, text, public.venue_activity, text, text
);
drop function public.create_professional(text, text, text, text, boolean, text);
drop function public.admin_review_list();

-- Helper ----------------------------------------------------------------------

-- Punto dell'organizzazione: tutti e due o nessuno, e dentro la Comunidad de Madrid (riquadro largo):
-- un punto in mezzo al mare è un errore, non una sede.
create function private.make_org_point(p_lng double precision, p_lat double precision)
returns extensions.geography
language plpgsql
immutable
set search_path = ''
as $$
begin
  if p_lng is null and p_lat is null then
    return null;
  end if;
  if p_lng is null or p_lat is null
     or p_lng not between -4.6 and -3.0
     or p_lat not between 39.8 and 41.2 then
    raise exception 'invalid_location';
  end if;
  return extensions.st_setsrid(extensions.st_makepoint(p_lng, p_lat), 4326)::extensions.geography;
end;
$$;

-- register_entity -------------------------------------------------------------

-- Tutto in una transazione: organizzazione con la scheda completa, verifica, membership, accettazione, risposte.
-- Chi entra e con quale avviso: tabella "Chi entra e come" in docs/DATA_MODEL.md.
create function public.register_entity(
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

  insert into public.organizations as o (
    kind, entity_type, name, one_liner, when_to_visit, contact_email, contact_phone, contact_url,
    usual_category, address, location, entry_method, venue_activity, verified, flagged_for_review, flag_reason
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
    v_entry = 'municipal_registry',
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

revoke execute on function public.register_entity(
  public.entity_type, text, text, text, text, boolean, text, public.venue_activity, text, text, text,
  text, text, text, text, text, public.event_category, text, double precision, double precision
) from public, anon, authenticated;
grant execute on function public.register_entity(
  public.entity_type, text, text, text, text, boolean, text, public.venue_activity, text, text, text,
  text, text, text, text, text, public.event_category, text, double precision, double precision
) to authenticated;

-- create_professional ---------------------------------------------------------

-- "Gente que hace cosas": niente NIF, niente punto; il barrio si sceglie dall'elenco.
create function public.create_professional(
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

revoke execute on function public.create_professional(
  text, text, text, text, boolean, text, text, text, text, text, text, boolean
) from public, anon, authenticated;
grant execute on function public.create_professional(
  text, text, text, text, boolean, text, text, text, text, text, text, boolean
) to authenticated;

-- Revisione (solo admin) ------------------------------------------------------

-- Mai NIF, email, telefono o user id: sono i soli dati usati per la revisione, anche con Claude.
create function public.admin_review_list()
returns table (
  id uuid,
  slug text,
  name text,
  kind public.org_kind,
  entity_type public.entity_type,
  entry_method public.entry_method,
  venue_activity public.venue_activity,
  neighborhood_name text,
  contact_url text,
  what_for_whom text,
  how_sustained text,
  what_they_offer text,
  status public.org_status,
  flagged_for_review boolean,
  flag_reason public.flag_reason,
  created_at timestamptz,
  last_reviewed_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
#variable_conflict use_column
begin
  if not public.is_admin() then
    raise exception 'forbidden';
  end if;

  return query
  select
    o.id, o.slug, o.name, o.kind, o.entity_type, o.entry_method, o.venue_activity, n.name, o.contact_url,
    a.what_for_whom, a.how_sustained, a.what_they_offer, o.status, o.flagged_for_review, o.flag_reason,
    o.created_at, o.last_reviewed_at
  from public.organizations o
  left join public.neighborhoods n on n.id = o.neighborhood_id
  left join public.organization_answers a on a.organization_id = o.id
  order by o.flagged_for_review desc, o.last_reviewed_at asc nulls first, o.created_at desc;
end;
$$;

revoke execute on function public.admin_review_list() from public, anon, authenticated;
grant execute on function public.admin_review_list() to authenticated;

-- Stessa firma: la revisione spegne anche il motivo dell'avviso.
create or replace function public.mark_reviewed(p_org uuid)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'forbidden';
  end if;

  update public.organizations o
  set last_reviewed_at = now(), flagged_for_review = false, flag_reason = null
  where o.id = p_org;

  if not found then
    raise exception 'not_found';
  end if;
end;
$$;
