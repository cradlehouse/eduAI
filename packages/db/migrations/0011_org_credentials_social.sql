-- 0011: org-supplied vendor keys (Vault-backed) and connected social accounts.

create table public.org_credentials (
  id         uuid primary key default gen_random_uuid(),
  org_id     uuid not null references public.orgs (id) on delete cascade,
  provider   text not null check (provider in ('fal', 'replicate', 'runway', 'elevenlabs', 'ayrshare')),
  secret_ref uuid not null,
  label      text not null default '',
  created_by uuid references public.users (id),
  created_at timestamptz not null default now(),
  rotated_at timestamptz,
  revoked_at timestamptz
);
comment on column public.org_credentials.secret_ref is 'vault.secrets.id. The key itself is never in this table; the orchestrator reads vault.decrypted_secrets under service role.';
create unique index org_credentials_active_idx on public.org_credentials (org_id, provider) where revoked_at is null;

create type public.social_platform as enum ('youtube', 'tiktok', 'instagram', 'facebook', 'x', 'linkedin');

create table public.social_accounts (
  id            uuid primary key default gen_random_uuid(),
  org_id        uuid not null references public.orgs (id) on delete cascade,
  platform      public.social_platform not null,
  owner_user_id uuid references public.users (id) on delete cascade,
  handle        text not null default '',
  profile_ref   uuid,
  connected_at  timestamptz not null default now(),
  revoked_at    timestamptz,
  created_at    timestamptz not null default now(),
  unique (org_id, id)
);
comment on column public.social_accounts.owner_user_id is 'null = org account. Set = personal account (blocked for minors).';
comment on column public.social_accounts.profile_ref   is 'vault.secrets.id holding the Ayrshare profile key.';
create unique index social_accounts_active_idx
  on public.social_accounts (org_id, platform, coalesce(owner_user_id, '00000000-0000-0000-0000-000000000000'::uuid))
  where revoked_at is null;

-- Minors can never hold a personal social account, whoever inserts the row.
create or replace function eduai.social_accounts_no_minors() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.owner_user_id is not null and eduai.is_minor_in(new.org_id, new.owner_user_id) then
    raise exception 'minor_personal_social_account' using errcode = 'P0001';
  end if;
  return new;
end $$;
create trigger social_accounts_no_minors before insert or update on public.social_accounts
  for each row execute function eduai.social_accounts_no_minors();
