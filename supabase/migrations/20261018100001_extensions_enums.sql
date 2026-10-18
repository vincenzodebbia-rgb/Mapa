-- Estensioni, enum e schema `private` per gli helper interni.
-- Lo schema `private` non è esposto dall'API: le sue funzioni si usano nelle policy e nei trigger,
-- ma nessuno può chiamarle via RPC.

create extension if not exists postgis with schema extensions;
create extension if not exists unaccent with schema extensions;
create extension if not exists pgcrypto with schema extensions;

create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to anon, authenticated, service_role;

-- Enum ------------------------------------------------------------------------

create type public.org_kind as enum ('association', 'venue', 'professional');
create type public.entry_method as enum ('municipal_registry', 'invite', 'self_declared', 'email_only');
create type public.venue_activity as enum (
  'libreria', 'sala_pequena', 'centro_cultural', 'galeria', 'taller_estudio', 'cafe_cultural',
  'discoteca_club', 'bar_nocturno', 'otro'
);
create type public.org_status as enum ('active', 'suspended');
create type public.moderation_action as enum ('suspend', 'reactivate', 'delete');
create type public.event_category as enum (
  'musica', 'teatro_danza', 'arte', 'talleres', 'encuentros', 'comunidad', 'otros'
);
create type public.price_type as enum ('free', 'donation', 'paid');
create type public.recurrence as enum ('none', 'weekly', 'monthly');
create type public.thread_status as enum ('pending', 'confirmed');
create type public.space_type as enum ('sala', 'local', 'exterior', 'estudio', 'otro');

-- Helper che non dipendono da tabelle ----------------------------------------

-- Unico posto in cui vive la lista delle attività "dubbie": TypeScript non la ripete.
create function public.is_doubtful_activity(p_activity public.venue_activity)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select coalesce(p_activity in ('discoteca_club', 'bar_nocturno', 'otro'), false);
$$;

create function private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- Il NIF si confronta sempre normalizzato: maiuscolo, solo lettere e cifre.
create function private.normalize_nif(p_nif text)
returns text
language sql
immutable
set search_path = ''
as $$
  select upper(regexp_replace(coalesce(p_nif, ''), '[^A-Za-z0-9]', '', 'g'));
$$;

-- Solo NIF di enti (lettera iniziale da persona giuridica). Esclusi DNI (cifra iniziale),
-- NIE (X/Y/Z) e i NIF personali speciali (K/L/M): non raccogliamo documenti personali.
create function private.is_entity_nif(p_nif text)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select coalesce(p_nif ~ '^[ABCDEFGHJNPQRSUVW][0-9]{7}[0-9A-J]$', false);
$$;

-- Slug generato una sola volta alla creazione: non cambia mai quando cambia il titolo.
-- security definer perché deve vedere anche righe nascoste dalla RLS (es. eventi di enti sospesi),
-- altrimenti una collisione invisibile finirebbe in un errore di unicità.
create function private.make_unique_slug(p_text text, p_table text)
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

  -- unaccent a due argomenti: con search_path vuoto quello a un argomento non trova il dizionario.
  v_base := lower(extensions.unaccent('extensions.unaccent'::regdictionary, coalesce(p_text, '')));
  v_base := regexp_replace(v_base, '[^a-z0-9]+', '-', 'g');
  v_base := btrim(left(btrim(v_base, '-'), 60), '-');
  if v_base = '' then
    v_base := 'sin-nombre';
  end if;

  v_slug := v_base;
  loop
    execute format('select exists (select 1 from public.%I where slug = $1)', p_table)
      into v_exists
      using v_slug;
    exit when not v_exists;
    v_n := v_n + 1;
    v_slug := btrim(left(v_base, 60 - char_length(v_n::text) - 1), '-') || '-' || v_n;
  end loop;

  return v_slug;
end;
$$;
