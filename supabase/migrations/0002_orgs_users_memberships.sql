-- 0002: orgs, users (mirror of auth.users), memberships, invites-free helpers.
-- Every RLS policy in 0101 is built on the eduai.* helpers defined here.

create type public.member_role     as enum ('student', 'instructor', 'admin', 'owner');
create type public.content_tier    as enum ('M', 'A');
create type public.credential_mode as enum ('org', 'platform');
create type public.lane            as enum ('explore', 'control', 'finish', 'voice_likeness');

comment on type public.content_tier    is 'M = minors-safe (default). A = adult-permitted, with per-project instructor unlocks. Spec §24.';
comment on type public.credential_mode is 'org = Model A (org-supplied vendor keys in Vault). platform = Model B (platform keys + credits).';
comment on type public.lane            is 'UX language for creative intent + operating conditions. explore = quick cheap tests; control = references/settings/reproducible; finish = release-quality; voice_likeness = work from a specific person (consent + instructor gate).';

create table public.orgs (
  id                 uuid primary key default gen_random_uuid(),
  slug               text not null unique check (slug ~ '^[a-z0-9][a-z0-9-]{1,39}$'),
  name               text not null,
  content_tier       public.content_tier not null default 'M',
  credential_default public.credential_mode not null default 'platform',
  public_entity      boolean not null default false,
  has_minors         boolean not null default false,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);
create trigger orgs_set_updated_at before update on public.orgs
  for each row execute function eduai.set_updated_at();

create table public.users (
  id           uuid primary key references auth.users (id) on delete cascade,
  email        text not null unique,
  display_name text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
comment on table public.users is 'Mirror of auth.users. Global (no org_id): access is decided through memberships.';
create trigger users_set_updated_at before update on public.users
  for each row execute function eduai.set_updated_at();

create or replace function eduai.handle_new_auth_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.users (id, email, display_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1))
  )
  on conflict (id) do update set email = excluded.email;
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function eduai.handle_new_auth_user();

create table public.memberships (
  id         uuid primary key default gen_random_uuid(),
  org_id     uuid not null references public.orgs (id) on delete cascade,
  user_id    uuid not null references public.users (id) on delete cascade,
  role       public.member_role not null default 'student',
  is_minor   boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (org_id, user_id)
);
comment on column public.memberships.is_minor is 'Set at invite from DOB; the DOB itself is never stored. Forces content tier M, blocks personal social accounts, requires a guardian signer.';
create unique index memberships_one_owner_per_org on public.memberships (org_id) where role = 'owner';
create index memberships_user_idx on public.memberships (user_id);
create trigger memberships_set_updated_at before update on public.memberships
  for each row execute function eduai.set_updated_at();

-- ---------------------------------------------------------------------------
-- RLS helpers. All security definer (owned by postgres, so they read memberships
-- without recursing into its own policies). p_user defaults to the JWT subject so
-- policies can call them bare; the orchestrator passes an explicit user.
-- ---------------------------------------------------------------------------

create or replace function eduai.org_role(p_org uuid, p_user uuid default auth.uid())
returns public.member_role
language sql stable security definer set search_path = public as $$
  select role from public.memberships where org_id = p_org and user_id = p_user
$$;

create or replace function eduai.is_org_member(p_org uuid, p_user uuid default auth.uid())
returns boolean
language sql stable security definer set search_path = public as $$
  select eduai.org_role(p_org, p_user) is not null
$$;

create or replace function eduai.has_org_role(p_org uuid, p_user uuid, variadic p_roles public.member_role[])
returns boolean
language sql stable security definer set search_path = public as $$
  select eduai.org_role(p_org, p_user) = any (p_roles)
$$;

create or replace function eduai.is_org_admin(p_org uuid, p_user uuid default auth.uid())
returns boolean
language sql stable security definer set search_path = public as $$
  select eduai.org_role(p_org, p_user) in ('admin', 'owner')
$$;

create or replace function eduai.is_org_owner(p_org uuid, p_user uuid default auth.uid())
returns boolean
language sql stable security definer set search_path = public as $$
  select eduai.org_role(p_org, p_user) = 'owner'
$$;

create or replace function eduai.is_minor_in(p_org uuid, p_user uuid default auth.uid())
returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(
    (select is_minor from public.memberships where org_id = p_org and user_id = p_user),
    false)
$$;

-- Effective content tier for a user in an org: minors are always 'M', whatever the org says.
create or replace function eduai.effective_content_tier(p_org uuid, p_user uuid default auth.uid())
returns public.content_tier
language sql stable security definer set search_path = public as $$
  select case
    when eduai.is_minor_in(p_org, p_user) then 'M'::public.content_tier
    else (select content_tier from public.orgs where id = p_org)
  end
$$;

-- True when the caller shares at least one org with p_user (used by users.select).
create or replace function eduai.shares_org_with(p_user uuid, p_me uuid default auth.uid())
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.memberships a
    join public.memberships b on b.org_id = a.org_id
    where a.user_id = p_me and b.user_id = p_user)
$$;

-- Admins may grant student/instructor; only the owner may grant admin. Nobody grants owner
-- through the API (one per org, set by service role).
create or replace function eduai.can_grant_role(p_org uuid, p_role public.member_role, p_user uuid default auth.uid())
returns boolean
language sql stable security definer set search_path = public as $$
  select case
    when p_role = 'owner' then false
    when p_role = 'admin' then eduai.is_org_owner(p_org, p_user)
    else eduai.is_org_admin(p_org, p_user)
  end
$$;
