-- Sessione 7 (docs/piani/sessione-7.md): Mi ficha e Mi cuenta.
-- 1. Quando cambia il nome di un'organizzazione cambia anche lo slug (decisione del fondatore del 14 novembre); il vecchio
--    resta riservato all'organizzazione in organization_slugs e la pagina /a/<vecchio> rimanda al nuovo (308).
--    Per gli eventi resta la regola di AGENTS.md: lo slug non cambia mai.
-- 2. contact_email con un formato controllato anche nel database (rapporto di sicurezza, B4).
-- 3. delete_my_account() elimina SEMPRE la realtà dell'utente ("un account = una realtà").
-- 4. export_my_data() contiene anche i vecchi slug.

-- Slug: base comune ------------------------------------------------------------------------

-- Stessa trasformazione di make_unique_slug (unaccent, minuscolo, trattini, max 60 caratteri), in un posto solo.
create function private.slug_base(p_text text)
returns text
language plpgsql
stable
set search_path = ''
as $$
declare
  v_base text;
begin
  -- unaccent a due argomenti: con search_path vuoto quello a un argomento non trova il dizionario.
  v_base := lower(extensions.unaccent('extensions.unaccent'::regdictionary, coalesce(p_text, '')));
  v_base := regexp_replace(v_base, '[^a-z0-9]+', '-', 'g');
  v_base := btrim(left(btrim(v_base, '-'), 60), '-');
  return case when v_base = '' then 'sin-nombre' else v_base end;
end;
$$;

revoke execute on function private.slug_base(text) from public, anon, authenticated;

-- organization_slugs ----------------------------------------------------------------------

-- Vecchi slug di un'organizzazione: riservati a lei per sempre (finché esiste), mai presi da altre.
create table public.organization_slugs (
  slug text primary key check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  created_at timestamptz not null default now()
);

create index organization_slugs_organization_idx on public.organization_slugs (organization_id);

alter table public.organization_slugs enable row level security;
revoke all on table public.organization_slugs from anon, authenticated;
grant select on table public.organization_slugs to anon, authenticated;

-- Visibile solo se l'organizzazione è visibile (la subquery passa dalla RLS di organizations): un vecchio slug di
-- un'organizzazione sospesa non rimanda da nessuna parte. Nessuna scrittura per gli utenti: la fa solo il trigger.
create policy organization_slugs_select on public.organization_slugs
  for select to anon, authenticated
  using (exists (select 1 from public.organizations o where o.id = organization_id));

-- make_unique_slug: i vecchi slug sono occupati ----------------------------------------------

-- Stessa firma: per le organizzazioni uno slug è occupato anche se è il vecchio slug di qualcuno.
create or replace function private.make_unique_slug(p_text text, p_table text)
returns text
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_base text;
  v_slug text;
  v_n integer := 1;
  v_exists boolean;
begin
  if p_table not in ('organizations', 'events') then
    raise exception 'invalid_slug_table';
  end if;

  v_base := private.slug_base(p_text);
  v_slug := v_base;
  loop
    execute format('select exists (select 1 from public.%I where slug = $1)', p_table)
      into v_exists
      using v_slug;
    if not v_exists and p_table = 'organizations' then
      select exists (select 1 from public.organization_slugs s where s.slug = v_slug) into v_exists;
    end if;
    exit when not v_exists;
    v_n := v_n + 1;
    v_slug := btrim(left(v_base, 60 - char_length(v_n::text) - 1), '-') || '-' || v_n;
  end loop;

  return v_slug;
end;
$$;

-- Nuovo slug dopo un cambio di nome -----------------------------------------------------------

-- security definer: scrive in organization_slugs, dove gli utenti non hanno permessi.
-- - stesso slug di prima (cambiano solo maiuscole o accenti, o è "nome-2" e il nome dà ancora "nome") → nessun cambio;
-- - uno slug già stato dell'organizzazione stessa → lo riprende (e il corrente va tra i vecchi);
-- - altrimenti uno slug nuovo e unico, con un limite: al massimo 5 cambi ogni 30 giorni per organizzazione (ogni cambio
--   riserva uno slug per sempre: senza limite si potrebbero occupare nomi). Seed e service_role non contano.
create function private.next_organization_slug(p_org uuid, p_current text, p_name text)
returns text
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_base text := private.slug_base(p_name);
  v_own text;
  v_new text;
begin
  if p_current = v_base or p_current ~ ('^' || v_base || '-[0-9]+$') then
    return p_current;
  end if;

  select s.slug into v_own
  from public.organization_slugs s
  where s.organization_id = p_org and (s.slug = v_base or s.slug ~ ('^' || v_base || '-[0-9]+$'))
  order by (s.slug = v_base) desc, s.created_at desc
  limit 1;

  if v_own is not null then
    delete from public.organization_slugs s where s.slug = v_own;
    v_new := v_own;
  else
    if auth.uid() is not null then
      perform private.assert_rate_limit('db:org-slug:' || p_org::text, 5, interval '30 days');
    end if;
    v_new := private.make_unique_slug(p_name, 'organizations');
  end if;

  insert into public.organization_slugs (slug, organization_id) values (p_current, p_org)
  on conflict (slug) do nothing;
  return v_new;
end;
$$;

-- Il trigger organizations_before_write gira con i permessi dell'utente, quindi authenticated deve poterla eseguire.
-- Lo schema private non è esposto dall'API (config.toml): nessuno la chiama via RPC.
revoke execute on function private.next_organization_slug(uuid, text, text) from public, anon;
grant execute on function private.next_organization_slug(uuid, text, text) to authenticated;

-- Trigger di organizations: ultima versione (entity_type) + cambio di slug ----------------------

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

  -- Lo slug non si scrive mai a mano: cambia solo qui sotto, con il nome.
  if new.slug is distinct from old.slug then
    raise exception 'slug_immutable';
  end if;
  if new.name is distinct from old.name then
    new.slug := private.next_organization_slug(old.id, old.slug, new.name);
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

-- B4: formato di contact_email ---------------------------------------------------------------

-- Una sola @, un punto nel dominio, niente spazi né ? & < > , ; : " (il mailto: non deve poter aggiungere destinatari o
-- testo). Compatibile con z.email() dell'iscrizione e di Mi ficha. not valid: vale per ogni insert e update da adesso.
-- Il telefono resta libero (≤ 30): l'iscrizione accetta già qualsiasi testo e il link tel: tiene solo cifre e "+".
alter table public.organizations
  add constraint organizations_contact_email_format
  check (contact_email is null or contact_email ~ '^[^\s@?&<>,;:"]+@[^\s@?&<>,;:"]+\.[^\s@?&<>,;:".]+$')
  not valid;

-- delete_my_account: sempre anche la realtà ---------------------------------------------------

-- Stessa firma. "Un account = una realtà": la realtà dell'utente si elimina sempre, anche se avesse altri membri
-- (nella v1 non succede). A cascata: eventi, organizzatori, fili, inviti, spazi, verifica (NIF), vecchi slug, membership.
-- I file di Storage (logo) li toglie prima l'action. Restano solo le moderation_actions (senza riferimenti all'utente).
create or replace function public.delete_my_account()
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

  if v_org is not null then
    -- Esplicito anche se la cascata lo farebbe: le risposte sono testo privato dell'ente.
    delete from public.organization_answers a where a.organization_id = v_org;
    delete from public.organizations o where o.id = v_org;
  end if;

  -- A cascata: membership, accettazioni, app_admins; inviti creati e moderation_actions.admin_id → null.
  delete from auth.users u where u.id = v_uid;
end;
$$;

-- export_my_data: anche i vecchi slug ----------------------------------------------------------

create or replace function public.export_my_data()
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
    'old_slugs', coalesce((
      select jsonb_agg(jsonb_build_object('slug', s.slug, 'created_at', s.created_at) order by s.created_at)
      from public.organization_slugs s where s.organization_id = v_org
    ), '[]'::jsonb),
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
