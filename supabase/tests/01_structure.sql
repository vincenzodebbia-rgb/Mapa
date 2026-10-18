-- Test 9 e 10: ogni tabella in public ha la RLS, ogni vista è security_invoker.
-- In più: ogni funzione security definer in public e private ha un search_path fisso.
begin;
create extension if not exists pgtap with schema extensions;
set local search_path = extensions, public;
select no_plan();

select is(
  (select array_agg(tablename::text order by tablename) from pg_tables
   where schemaname = 'public' and not rowsecurity),
  null,
  'ogni tabella in public ha la RLS attiva'
);

select is(
  (select array_agg(c.relname::text order by c.relname)
   from pg_class c join pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'public' and c.relkind = 'v'
     and not coalesce(c.reloptions @> array['security_invoker=true'], false)),
  null,
  'ogni vista in public ha security_invoker = true'
);

select is(
  (select array_agg(p.proname::text order by p.proname)
   from pg_proc p join pg_namespace n on n.oid = p.pronamespace
   where n.nspname in ('public', 'private') and p.prosecdef
     and not coalesce(p.proconfig @> array['search_path=""'], false)),
  null,
  'ogni funzione security definer ha search_path vuoto'
);

select * from finish();
rollback;
