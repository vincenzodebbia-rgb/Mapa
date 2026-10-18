-- Funzioni dell'applicazione. Ogni funzione security definer ha search_path vuoto e nomi qualificati.
-- Supabase concede EXECUTE ad anon/authenticated su ogni funzione nuova in public:
-- qui lo si toglie sempre e lo si ridà solo a chi serve.
-- Gli errori sono codici stabili (raise exception '<codice>') che le action traducono in messages/es.json.

-- event_occurrences -----------------------------------------------------------

-- Unica implementazione delle ripetizioni. Calcola in ora locale di Madrid, così le 19:00 restano
-- le 19:00 al cambio dell'ora legale; il mensile parte sempre dalla data originale (dal 31 non deriva).
-- security invoker: passa dalla RLS di events (niente eventi di enti sospesi per il pubblico).
create function public.event_occurrences(p_from timestamptz, p_to timestamptz)
returns table (event_id uuid, occ_start timestamptz, occ_end timestamptz)
language sql
stable
security invoker
set search_path = ''
as $$
  select
    e.id,
    o.local_start at time zone 'Europe/Madrid',
    (o.local_start at time zone 'Europe/Madrid') + (e.ends_at - e.starts_at)
  from public.events e
  cross join lateral (
    select
      (e.starts_at at time zone 'Europe/Madrid')
        + k * case e.recurrence
                when 'weekly' then interval '1 week'
                when 'monthly' then interval '1 month'
                else interval '0 days'
              end as local_start
    -- 6 mesi al massimo: 27 settimane o 6 mesi dopo la prima occorrenza.
    from generate_series(0, case e.recurrence when 'weekly' then 27 when 'monthly' then 6 else 0 end) as k
  ) o
  where e.starts_at < p_to
    and (e.recurrence = 'none' or o.local_start::date <= e.recurrence_until)
    and o.local_start at time zone 'Europe/Madrid' < p_to
    and (o.local_start at time zone 'Europe/Madrid') + (e.ends_at - e.starts_at) > p_from;
$$;

revoke execute on function public.event_occurrences(timestamptz, timestamptz) from public, anon, authenticated;
grant execute on function public.event_occurrences(timestamptz, timestamptz) to anon, authenticated;

-- check_rate_limit ------------------------------------------------------------

-- Solo service_role: se fosse chiamabile via RPC, chiunque potrebbe consumare il limite di un altro.
create function public.check_rate_limit(p_key text, p_max integer, p_window interval)
returns boolean
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_seconds double precision := extract(epoch from p_window);
  v_start timestamptz;
  v_count integer;
begin
  if p_key is null or p_max is null or p_max < 1 or v_seconds is null or v_seconds <= 0 then
    raise exception 'invalid_rate_limit';
  end if;

  v_start := to_timestamp(floor(extract(epoch from now()) / v_seconds) * v_seconds);

  insert into public.rate_limits as r (key, window_start, count)
  values (p_key, v_start, 1)
  on conflict (key, window_start) do update set count = r.count + 1
  returning r.count into v_count;

  -- Le finestre vecchie non servono più.
  delete from public.rate_limits r where r.key = p_key and r.window_start < v_start;

  return v_count <= p_max;
end;
$$;

revoke execute on function public.check_rate_limit(text, integer, interval) from public, anon, authenticated;
grant execute on function public.check_rate_limit(text, integer, interval) to service_role;

-- Helper dell'iscrizione ------------------------------------------------------

create function private.assert_terms(p_terms_version text, p_privacy_version text, p_age_confirmed boolean)
returns void
language plpgsql
set search_path = ''
as $$
begin
  if coalesce(p_age_confirmed, false) is false
     or nullif(btrim(coalesce(p_terms_version, '')), '') is null
     or nullif(btrim(coalesce(p_privacy_version, '')), '') is null then
    raise exception 'terms_required';
  end if;
end;
$$;

-- Restituisce l'invito valido (non usato, non scaduto, di un'associazione attiva) e lo blocca
-- fino alla fine della transazione, così due iscrizioni non usano lo stesso invito.
create function private.lock_valid_invite(p_token text)
returns uuid
language sql
volatile
security definer
set search_path = ''
as $$
  select i.id
  from public.invites i
  join public.organizations o on o.id = i.organization_id
  where p_token is not null
    and i.token = p_token
    and i.used_at is null
    and i.expires_at > now()
    and o.status = 'active'
    and o.kind = 'association'
  for update of i;
$$;

-- lookup_municipal_association ------------------------------------------------

-- Solo found + nome ufficiale, per "¿Sois <nombre>?". Mai altri campi.
-- Solo service_role: l'action chiama prima check_rate_limit (anti-enumerazione) e poi questa.
create function public.lookup_municipal_association(p_nif text)
returns table (found boolean, name text)
language sql
stable
security definer
set search_path = ''
as $$
  select m.name is not null, m.name
  from (
    select (
      select ma.name from public.municipal_associations ma
      where ma.cif = private.normalize_nif(p_nif)
    ) as name
  ) m;
$$;

revoke execute on function public.lookup_municipal_association(text) from public, anon, authenticated;
grant execute on function public.lookup_municipal_association(text) to service_role;

-- register_entity -------------------------------------------------------------

create function public.register_entity(
  p_kind public.org_kind,
  p_nif text,
  p_name text,
  p_terms_version text,
  p_privacy_version text,
  p_age_confirmed boolean,
  p_invite_token text default null,
  p_venue_activity public.venue_activity default null,
  p_what_for_whom text default null,
  p_how_sustained text default null
)
returns table (slug text, flagged boolean)
language plpgsql
volatile
security definer
set search_path = ''
as $$
#variable_conflict use_column
declare
  v_uid uuid := auth.uid();
  v_nif text := private.normalize_nif(p_nif);
  v_name text := btrim(coalesce(p_name, ''));
  v_what text := nullif(btrim(coalesce(p_what_for_whom, '')), '');
  v_how text := nullif(btrim(coalesce(p_how_sustained, '')), '');
  v_invite_id uuid;
  v_entry public.entry_method;
  v_flagged boolean := false;
  v_org_id uuid;
  v_slug text;
begin
  if v_uid is null then
    raise exception 'not_authenticated';
  end if;
  if p_kind is null or p_kind not in ('association', 'venue') then
    raise exception 'invalid_kind';
  end if;
  if exists (select 1 from public.memberships m where m.user_id = v_uid) then
    raise exception 'already_member';
  end if;
  perform private.assert_terms(p_terms_version, p_privacy_version, p_age_confirmed);
  if char_length(v_name) not between 1 and 120 then
    raise exception 'invalid_name';
  end if;
  if not private.is_entity_nif(v_nif) then
    raise exception 'invalid_nif';
  end if;
  if exists (select 1 from public.organization_verifications ov where ov.nif = v_nif) then
    raise exception 'already_claimed';
  end if;
  -- Per gli espacios attività e risposte sono obbligatorie; per le associazioni le risposte sono facoltative.
  if p_kind = 'venue' then
    if p_venue_activity is null then
      raise exception 'venue_activity_required';
    end if;
    if v_what is null or v_how is null then
      raise exception 'answers_required';
    end if;
  end if;
  if char_length(v_what) > 500 or char_length(v_how) > 500 then
    raise exception 'answer_too_long';
  end if;

  if p_invite_token is not null then
    v_invite_id := private.lock_valid_invite(p_invite_token);
    if v_invite_id is null then
      raise exception 'invalid_invite';
    end if;
  end if;

  if v_invite_id is not null then
    v_entry := 'invite';
  elsif p_kind = 'association'
        and exists (select 1 from public.municipal_associations ma where ma.cif = v_nif) then
    v_entry := 'municipal_registry';
  else
    v_entry := 'self_declared';
    if p_kind = 'venue' then
      v_flagged := public.is_doubtful_activity(p_venue_activity);
    else
      -- DA DECIDERE (sessione 5): associazione fuori dall'elenco del Comune e senza invito.
      -- Per ora entra senza avviso; cambiare qui in true se si sceglie l'avviso.
      v_flagged := false;
    end if;
  end if;

  insert into public.organizations as o (kind, name, entry_method, venue_activity, verified, flagged_for_review)
  values (
    p_kind,
    v_name,
    v_entry,
    case when p_kind = 'venue' then p_venue_activity end,
    v_entry = 'municipal_registry',
    v_flagged
  )
  returning o.id, o.slug into v_org_id, v_slug;

  begin
    insert into public.organization_verifications (organization_id, nif) values (v_org_id, v_nif);
  exception when unique_violation then
    -- Due iscrizioni contemporanee con lo stesso NIF: vince la prima.
    raise exception 'already_claimed';
  end;

  insert into public.memberships (user_id, organization_id) values (v_uid, v_org_id);
  insert into public.terms_acceptances (user_id, terms_version, privacy_version, age_confirmed)
  values (v_uid, btrim(p_terms_version), btrim(p_privacy_version), true);
  insert into public.organization_answers (organization_id, what_for_whom, how_sustained)
  values (v_org_id, v_what, v_how);

  if v_invite_id is not null then
    update public.invites i set used_at = now(), used_by_org = v_org_id where i.id = v_invite_id;
  end if;

  -- flagged serve all'action per sapere se mandare l'avviso al fondatore.
  return query select v_slug, v_flagged;
end;
$$;

revoke execute on function public.register_entity(
  public.org_kind, text, text, text, text, boolean, text, public.venue_activity, text, text
) from public, anon, authenticated;
grant execute on function public.register_entity(
  public.org_kind, text, text, text, text, boolean, text, public.venue_activity, text, text
) to authenticated;

-- create_professional ---------------------------------------------------------

create function public.create_professional(
  p_name text,
  p_one_liner text,
  p_terms_version text,
  p_privacy_version text,
  p_age_confirmed boolean,
  p_invite_token text default null
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

  if p_invite_token is not null then
    v_invite_id := private.lock_valid_invite(p_invite_token);
    if v_invite_id is null then
      raise exception 'invalid_invite';
    end if;
  end if;

  insert into public.organizations as o (kind, name, one_liner, entry_method)
  values (
    'professional',
    v_name,
    v_one_liner,
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

revoke execute on function public.create_professional(text, text, text, text, boolean, text)
  from public, anon, authenticated;
grant execute on function public.create_professional(text, text, text, text, boolean, text) to authenticated;

-- get_invite ------------------------------------------------------------------

-- Per la landing pubblica: solo nome e slug di chi invita.
create function public.get_invite(p_token text)
returns table (name text, slug text)
language sql
stable
security definer
set search_path = ''
as $$
  select o.name, o.slug
  from public.invites i
  join public.organizations o on o.id = i.organization_id
  where i.token = p_token
    and i.used_at is null
    and i.expires_at > now()
    and o.status = 'active';
$$;

revoke execute on function public.get_invite(text) from public, anon, authenticated;
grant execute on function public.get_invite(text) to anon, authenticated;

-- export_my_data --------------------------------------------------------------

create function public.export_my_data()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_org uuid;
begin
  if v_uid is null then
    raise exception 'not_authenticated';
  end if;

  select m.organization_id into v_org from public.memberships m where m.user_id = v_uid;

  return jsonb_build_object(
    'exported_at', now(),
    'user', (
      select jsonb_build_object('id', u.id, 'email', u.email, 'created_at', u.created_at)
      from auth.users u where u.id = v_uid
    ),
    'memberships', coalesce((
      select jsonb_agg(to_jsonb(m)) from public.memberships m where m.user_id = v_uid
    ), '[]'::jsonb),
    'terms_acceptances', coalesce((
      select jsonb_agg(to_jsonb(t) order by t.accepted_at)
      from public.terms_acceptances t where t.user_id = v_uid
    ), '[]'::jsonb),
    'organization', (
      select (to_jsonb(o) - 'location')
             || jsonb_build_object('location', extensions.st_asgeojson(o.location)::jsonb)
      from public.organizations o where o.id = v_org
    ),
    'verification', (
      select to_jsonb(ov) from public.organization_verifications ov where ov.organization_id = v_org
    ),
    'answers', (
      select to_jsonb(a) from public.organization_answers a where a.organization_id = v_org
    ),
    'events', coalesce((
      select jsonb_agg(
        (to_jsonb(e) - 'location')
        || jsonb_build_object('location', extensions.st_asgeojson(e.location)::jsonb)
        order by e.starts_at
      )
      from public.events e where e.owner_org = v_org
    ), '[]'::jsonb),
    'event_organizers', coalesce((
      select jsonb_agg(to_jsonb(eo)) from public.event_organizers eo where eo.organization_id = v_org
    ), '[]'::jsonb),
    'threads', coalesce((
      select jsonb_agg(to_jsonb(t) order by t.created_at)
      from public.threads t where v_org in (t.proposer_org, t.receiver_org)
    ), '[]'::jsonb),
    'invites', coalesce((
      select jsonb_agg(to_jsonb(i) order by i.created_at)
      from public.invites i where i.organization_id = v_org
    ), '[]'::jsonb),
    'spaces', coalesce((
      select jsonb_agg(to_jsonb(s) order by s.created_at)
      from public.spaces s where s.organization_id = v_org
    ), '[]'::jsonb),
    -- Senza admin_id: è il dato di un'altra persona.
    'moderation_actions', coalesce((
      select jsonb_agg(
        jsonb_build_object('action', ma.action, 'reason', ma.reason, 'created_at', ma.created_at)
        order by ma.created_at
      )
      from public.moderation_actions ma where ma.organization_id = v_org
    ), '[]'::jsonb)
  );
end;
$$;

revoke execute on function public.export_my_data() from public, anon, authenticated;
grant execute on function public.export_my_data() to authenticated;

-- delete_my_account -----------------------------------------------------------

-- L'action cancella prima i file di Storage, poi chiama questa.
create function public.delete_my_account()
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_org uuid;
begin
  if v_uid is null then
    raise exception 'not_authenticated';
  end if;

  select m.organization_id into v_org from public.memberships m where m.user_id = v_uid;

  if v_org is not null
     and not exists (
       select 1 from public.memberships m where m.organization_id = v_org and m.user_id <> v_uid
     ) then
    -- Esplicito anche se la cascata lo farebbe: le risposte sono testo privato dell'ente.
    delete from public.organization_answers a where a.organization_id = v_org;
    -- A cascata: eventi, organizzatori, fili, inviti, spazi, verifica, membership.
    delete from public.organizations o where o.id = v_org;
  end if;

  -- A cascata: membership, accettazioni, app_admins; inviti creati e moderation_actions.admin_id → null.
  delete from auth.users u where u.id = v_uid;
end;
$$;

revoke execute on function public.delete_my_account() from public, anon, authenticated;
grant execute on function public.delete_my_account() to authenticated;

-- Revisione (solo admin) ------------------------------------------------------

-- Mai NIF, email, telefono o user id: sono i soli dati usati per la revisione, anche con Claude.
create function public.admin_review_list()
returns table (
  id uuid,
  slug text,
  name text,
  kind public.org_kind,
  entry_method public.entry_method,
  venue_activity public.venue_activity,
  neighborhood_name text,
  contact_url text,
  what_for_whom text,
  how_sustained text,
  status public.org_status,
  flagged_for_review boolean,
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
    o.id, o.slug, o.name, o.kind, o.entry_method, o.venue_activity, n.name, o.contact_url,
    a.what_for_whom, a.how_sustained, o.status, o.flagged_for_review, o.created_at, o.last_reviewed_at
  from public.organizations o
  left join public.neighborhoods n on n.id = o.neighborhood_id
  left join public.organization_answers a on a.organization_id = o.id
  order by o.flagged_for_review desc, o.last_reviewed_at asc nulls first, o.created_at desc;
end;
$$;

revoke execute on function public.admin_review_list() from public, anon, authenticated;
grant execute on function public.admin_review_list() to authenticated;

-- Restituisce all'action l'indirizzo a cui mandare la motivazione (obbligo DSA):
-- il contatto pubblico dell'ente, altrimenti l'email di accesso di un suo membro.
create function public.moderate_organization(
  p_org uuid,
  p_action public.moderation_action,
  p_reason text
)
returns text
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_reason text := btrim(coalesce(p_reason, ''));
  v_name text;
  v_email text;
begin
  if not public.is_admin() then
    raise exception 'forbidden';
  end if;
  if p_action is null then
    raise exception 'invalid_action';
  end if;
  if v_reason = '' then
    raise exception 'reason_required';
  end if;
  if char_length(v_reason) > 1000 then
    raise exception 'reason_too_long';
  end if;

  select o.name, o.contact_email into v_name, v_email
  from public.organizations o where o.id = p_org
  for update;
  if not found then
    raise exception 'not_found';
  end if;

  if v_email is null then
    select u.email into v_email
    from public.memberships m join auth.users u on u.id = m.user_id
    where m.organization_id = p_org
    order by m.created_at
    limit 1;
  end if;

  insert into public.moderation_actions (organization_id, organization_name, action, reason, admin_id)
  values (p_org, v_name, p_action, v_reason, auth.uid());

  if p_action = 'suspend' then
    update public.organizations o set status = 'suspended' where o.id = p_org;
  elsif p_action = 'reactivate' then
    update public.organizations o set status = 'active' where o.id = p_org;
  else
    -- Stessa cascata di delete_my_account, senza toccare auth.users. L'action cancella prima i file.
    delete from public.organizations o where o.id = p_org;
  end if;

  return v_email;
end;
$$;

revoke execute on function public.moderate_organization(uuid, public.moderation_action, text)
  from public, anon, authenticated;
grant execute on function public.moderate_organization(uuid, public.moderation_action, text) to authenticated;

create function public.mark_reviewed(p_org uuid)
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
  set last_reviewed_at = now(), flagged_for_review = false
  where o.id = p_org;

  if not found then
    raise exception 'not_found';
  end if;
end;
$$;

revoke execute on function public.mark_reviewed(uuid) from public, anon, authenticated;
grant execute on function public.mark_reviewed(uuid) to authenticated;
