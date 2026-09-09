-- 0001: extensions and the internal `eduai` schema.

create extension if not exists pgcrypto;

-- supabase_vault holds org-supplied vendor keys (credential mode 'org').
-- Guarded so the plain-Postgres CI run (scripts/db-test.sh) applies cleanly.
do $$
begin
  if exists (select 1 from pg_available_extensions where name = 'supabase_vault') then
    execute 'create extension if not exists supabase_vault';
  end if;
end $$;

-- `eduai` is the internal schema: helper functions used by RLS policies and by the
-- orchestrator (claim / reserve / settle). It is NOT exposed through PostgREST
-- (supabase/config.toml [api].schemas), so nothing in it is callable from the browser.
create schema if not exists eduai;
grant usage on schema eduai to authenticated, service_role;

create or replace function eduai.set_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;
