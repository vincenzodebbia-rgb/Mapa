-- Fili tra due associazioni. Il pending lo vedono solo le due parti; scade dopo 60 giorni senza cron
-- (scaduto = invisibile per policy).

create table public.threads (
  id uuid primary key default gen_random_uuid(),
  proposer_org uuid not null references public.organizations (id) on delete cascade,
  receiver_org uuid not null references public.organizations (id) on delete cascade,
  status public.thread_status not null default 'pending',
  story_proposer text not null check (char_length(story_proposer) between 1 and 300),
  story_receiver text check (char_length(story_receiver) <= 300),
  color_seed smallint not null default floor(random() * 4)::smallint check (color_seed between 0 and 3),
  created_at timestamptz not null default now(),
  confirmed_at timestamptz,
  expires_at timestamptz not null default now() + interval '60 days',
  constraint threads_distinct_orgs check (proposer_org <> receiver_org),
  constraint threads_confirmed_at check ((status = 'confirmed') = (confirmed_at is not null))
);

-- Una sola coppia, in qualunque direzione.
create unique index threads_pair_idx on public.threads (
  least(proposer_org, receiver_org), greatest(proposer_org, receiver_org)
);
create index threads_receiver_idx on public.threads (receiver_org);

-- Trigger ---------------------------------------------------------------------

create function private.threads_before_write()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_is_proposer boolean;
  v_is_receiver boolean;
begin
  if tg_op = 'INSERT' then
    if private.org_kind_of(new.proposer_org) is distinct from 'association'
       or private.org_kind_of(new.receiver_org) is distinct from 'association' then
      raise exception 'threads_only_between_associations';
    end if;
    if not private.is_org_active(new.receiver_org) then
      raise exception 'receiver_not_active';
    end if;
    return new;
  end if;

  -- I grant per colonna permettono solo status e storie; qui si decide chi può cosa.
  v_is_proposer := private.is_org_member(old.proposer_org);
  v_is_receiver := private.is_org_member(old.receiver_org);

  if new.story_proposer is distinct from old.story_proposer and not v_is_proposer then
    raise exception 'thread_forbidden_change';
  end if;
  if new.story_receiver is distinct from old.story_receiver and not v_is_receiver then
    raise exception 'thread_forbidden_change';
  end if;
  if new.status is distinct from old.status then
    if not (v_is_receiver and old.status = 'pending' and new.status = 'confirmed' and old.expires_at > now()) then
      raise exception 'thread_forbidden_change';
    end if;
    new.confirmed_at := now();
  end if;

  return new;
end;
$$;

create trigger threads_before_write
  before insert or update on public.threads
  for each row execute function private.threads_before_write();

-- Proporre o aggiornare un filo è "attività" per la parte che agisce.
create function private.threads_after_write()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.organizations o
  set last_activity_at = now()
  where o.id in (new.proposer_org, new.receiver_org)
    and private.is_org_member(o.id);
  return null;
end;
$$;

create trigger threads_after_write
  after insert or update on public.threads
  for each row execute function private.threads_after_write();

-- RLS -------------------------------------------------------------------------

alter table public.threads enable row level security;
revoke all on table public.threads from anon, authenticated;
grant select on table public.threads to anon, authenticated;
-- Senza grant su status/confirmed_at/story_receiver un nuovo filo nasce per forza pending.
grant insert (proposer_org, receiver_org, story_proposer) on table public.threads to authenticated;
grant update (status, story_proposer, story_receiver) on table public.threads to authenticated;
grant delete on table public.threads to authenticated;

create policy threads_select_public on public.threads
  for select to anon, authenticated
  using (
    status = 'confirmed'
    and private.is_org_active(proposer_org)
    and private.is_org_active(receiver_org)
  );

create policy threads_select_parties on public.threads
  for select to authenticated
  using (
    (private.is_org_member(proposer_org) or private.is_org_member(receiver_org))
    and (status = 'confirmed' or expires_at > now())
  );

create policy threads_insert_proposer on public.threads
  for insert to authenticated
  with check (
    status = 'pending'
    and private.is_org_member(proposer_org)
    and private.is_org_active(proposer_org)
  );

create policy threads_update_parties on public.threads
  for update to authenticated
  using (private.is_org_member(proposer_org) or private.is_org_member(receiver_org))
  with check (private.is_org_member(proposer_org) or private.is_org_member(receiver_org));

create policy threads_delete_parties on public.threads
  for delete to authenticated
  using (private.is_org_member(proposer_org) or private.is_org_member(receiver_org));
