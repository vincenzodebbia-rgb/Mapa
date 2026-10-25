-- Test 14 (sessione 4): logo e "Nuestra historia". Il membro scrive la storia e il logo della propria
-- organizzazione, solo nella propria cartella di org-logos; anon ed estranei no.
begin;
create extension if not exists pgtap with schema extensions;
set local search_path = extensions, public;
select no_plan();

insert into auth.users (id, email) values
  ('0000000a-0000-4000-8000-000000000014', 'a14@test.invalid'),
  ('0000000b-0000-4000-8000-000000000014', 'b14@test.invalid');
insert into public.organizations (id, kind, name, entry_method) values
  ('a0000000-0000-4000-8000-000000000014', 'association', 'Asociación catorce', 'self_declared'),
  ('b0000000-0000-4000-8000-000000000014', 'association', 'Otra catorce', 'self_declared');
insert into public.memberships (user_id, organization_id) values
  ('0000000a-0000-4000-8000-000000000014', 'a0000000-0000-4000-8000-000000000014'),
  ('0000000b-0000-4000-8000-000000000014', 'b0000000-0000-4000-8000-000000000014');

select results_eq(
  $$ select public, allowed_mime_types, file_size_limit from storage.buckets where id = 'org-logos' $$,
  $$ values (true, array['image/webp'], 524288::bigint) $$,
  'org-logos: pubblico, solo WebP, max 512 KB'
);

-- membro di A -------------------------------------------------------------------
set local request.jwt.claims to '{"sub":"0000000a-0000-4000-8000-000000000014","role":"authenticated"}';
set local role authenticated;

select lives_ok(
  $$ update public.organizations
     set story = 'Empezamos en un garaje.', logo_path = 'a0000000-0000-4000-8000-000000000014/logo.webp'
     where id = 'a0000000-0000-4000-8000-000000000014' $$,
  'il membro scrive storia e logo_path della propria organizzazione'
);
select throws_ok(
  $$ update public.organizations set story = repeat('x', 1001) where id = 'a0000000-0000-4000-8000-000000000014' $$,
  '23514', null,
  'storia oltre 1000 caratteri rifiutata'
);
select throws_ok(
  $$ update public.organizations set logo_path = 'b0000000-0000-4000-8000-000000000014/logo.webp'
     where id = 'a0000000-0000-4000-8000-000000000014' $$,
  '23514', null,
  'logo_path che punta alla cartella di un altro rifiutato'
);
select lives_ok(
  $$ insert into storage.objects (bucket_id, name) values ('org-logos', 'a0000000-0000-4000-8000-000000000014/logo.webp') $$,
  'il membro carica il logo nella propria cartella'
);
select throws_ok(
  $$ insert into storage.objects (bucket_id, name) values ('org-logos', 'b0000000-0000-4000-8000-000000000014/logo.webp') $$,
  '42501', null,
  'il membro non carica nella cartella di un altro'
);
select throws_ok(
  $$ insert into storage.objects (bucket_id, name) values ('org-logos', 'logo.webp') $$,
  '42501', null,
  'un file fuori da una cartella di organizzazione è rifiutato'
);

-- B prova a toccare la scheda di A ---------------------------------------------------
reset role;
set local request.jwt.claims to '{"sub":"0000000b-0000-4000-8000-000000000014","role":"authenticated"}';
set local role authenticated;
update public.organizations set story = 'Hackeada' where id = 'a0000000-0000-4000-8000-000000000014';
select is_empty(
  $$ select 1 from storage.objects
     where bucket_id = 'org-logos' and name like 'a0000000-0000-4000-8000-000000000014/%' $$,
  'B non vede (né può riscrivere con upsert) il logo di A'
);

-- anon -------------------------------------------------------------------------------
reset role;
set local request.jwt.claims to '{"role":"anon"}';
set local role anon;
select results_eq(
  $$ select story, logo_path from public.organizations where id = 'a0000000-0000-4000-8000-000000000014' $$,
  $$ values ('Empezamos en un garaje.', 'a0000000-0000-4000-8000-000000000014/logo.webp') $$,
  'anon legge storia e logo_path; la modifica di B non è passata'
);
select throws_ok(
  $$ insert into storage.objects (bucket_id, name) values ('org-logos', 'a0000000-0000-4000-8000-000000000014/x.webp') $$,
  '42501', null,
  'anon non carica loghi'
);
select throws_ok(
  $$ update public.organizations set story = 'x' where id = 'a0000000-0000-4000-8000-000000000014' $$,
  '42501', null,
  'anon non modifica la storia'
);

select * from finish();
rollback;
