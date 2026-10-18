-- Revisione e moderazione. Chi è admin sta in una tabella, mai in user_metadata.
-- Il fondatore si aggiunge a mano una volta per progetto (docs/operations.md).

create table public.app_admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.app_admins enable row level security;
revoke all on table public.app_admins from anon, authenticated;

-- Nessuna foreign key su organization_id: la riga deve restare anche dopo l'eliminazione
-- dell'organizzazione (eventuali reclami, max 3 anni).
create table public.moderation_actions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  organization_name text not null,
  action public.moderation_action not null,
  reason text not null check (char_length(reason) between 1 and 1000),
  admin_id uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

create index moderation_actions_organization_idx on public.moderation_actions (organization_id);

alter table public.moderation_actions enable row level security;
revoke all on table public.moderation_actions from anon, authenticated;

create function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.app_admins a where a.user_id = (select auth.uid()));
$$;

revoke execute on function public.is_admin() from public, anon, authenticated;
grant execute on function public.is_admin() to authenticated;
