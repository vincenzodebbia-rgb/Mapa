-- Tabelle tecniche condivise. Nessuna policy: le usa solo il server con la chiave secret
-- (geocode_cache) o tramite check_rate_limit() (rate_limits).

create table public.geocode_cache (
  query_normalized text primary key check (char_length(query_normalized) between 1 and 300),
  location extensions.geography(Point, 4326),
  display_name text check (char_length(display_name) <= 500),
  created_at timestamptz not null default now()
);

alter table public.geocode_cache enable row level security;
revoke all on table public.geocode_cache from anon, authenticated;

-- Le chiavi non sono mai dati personali in chiaro: id di organizzazioni o sha256(ip || sale del giorno).
create table public.rate_limits (
  key text not null check (char_length(key) between 1 and 200),
  window_start timestamptz not null,
  count integer not null default 0,
  primary key (key, window_start)
);

alter table public.rate_limits enable row level security;
revoke all on table public.rate_limits from anon, authenticated;
