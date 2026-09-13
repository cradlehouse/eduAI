-- Minimal stand-in for what a Supabase project provides out of the box, so the migrations
-- can be applied to plain Postgres in CI and locally. NEVER apply this to a real project.
do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'anon')          then create role anon nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then create role authenticated nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role')  then create role service_role nologin bypassrls; end if;
end $$;

create schema if not exists auth;
create table if not exists auth.users (
  id                 uuid primary key default gen_random_uuid(),
  email              text,
  raw_user_meta_data jsonb not null default '{}'::jsonb,
  created_at         timestamptz not null default now()
);

-- Supabase's auth.uid() reads the JWT subject from request.jwt.claims.
create or replace function auth.uid() returns uuid
language plpgsql stable as $$
declare c text := current_setting('request.jwt.claims', true);
begin
  if c is null or c = '' then return null; end if;
  return (c::jsonb ->> 'sub')::uuid;
end $$;

grant usage on schema public to anon, authenticated, service_role;
alter default privileges in schema public grant all on tables    to anon, authenticated, service_role;
alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
alter default privileges in schema public grant all on functions to anon, authenticated, service_role;
-- Supabase grants these; policies and RPC bodies call auth.uid() as the caller.
grant usage on schema auth to anon, authenticated, service_role;
grant execute on function auth.uid() to anon, authenticated, service_role;

-- Vault stand-in so 0119's functions compile and the orchestrator fixture can read decrypted_secrets.
create schema if not exists vault;
create table if not exists vault.secrets (id uuid primary key default gen_random_uuid(), secret text, name text, description text);
create or replace function vault.create_secret(new_secret text, new_name text default null, new_description text default '') returns uuid
language sql as $$ insert into vault.secrets (secret, name, description) values (new_secret, new_name, new_description) returning id $$;
create or replace function vault.update_secret(secret_id uuid, new_secret text default null, new_name text default null, new_description text default null) returns void
language sql as $$ update vault.secrets set secret = coalesce(new_secret, secret) where id = secret_id $$;
create or replace view vault.decrypted_secrets as select id, secret as decrypted_secret, name from vault.secrets;
