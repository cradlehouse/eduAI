-- 0005: the project bible (characters, locations, props, styles, voices) and consent releases.
-- Consent is specific, not binary: who, from what source, for which lanes, in what scope, until when.
-- Asset FKs (reference image, source asset, signed file) are added in 0006 once assets exist.

create type public.bible_kind         as enum ('character', 'location', 'prop', 'style', 'voice');
create type public.consent_state      as enum ('pending', 'signed', 'revoked');
create type public.distribution_scope as enum ('internal', 'cohort', 'public');

create table public.bible_entries (
  id               uuid primary key default gen_random_uuid(),
  org_id           uuid not null references public.orgs (id) on delete cascade,
  project_id       uuid not null,
  kind             public.bible_kind not null,
  name             text not null,
  description      text not null default '',
  likeness_of      text,
  requires_consent boolean not null default false,
  created_by       uuid references public.users (id),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  foreign key (org_id, project_id) references public.projects (org_id, id) on delete cascade,
  unique (project_id, kind, name),
  unique (org_id, id),
  check (likeness_of is null or requires_consent)
);
comment on column public.bible_entries.likeness_of      is 'Real person whose likeness/voice this entry depicts. Set ⇒ requires_consent.';
comment on column public.bible_entries.requires_consent is 'When true, Generate is blocked for any shot using this entry until a valid release covers the job''s lane (eduai.shot_consent_ok).';
create trigger bible_entries_set_updated_at before update on public.bible_entries
  for each row execute function eduai.set_updated_at();

create table public.consent_releases (
  id                 uuid primary key default gen_random_uuid(),
  org_id             uuid not null references public.orgs (id) on delete cascade,
  project_id         uuid not null,
  bible_entry_id     uuid not null,
  subject_name       text not null,
  rights_holder_name text not null,
  signer_email       text,
  is_guardian        boolean not null default false,
  subject_is_minor   boolean not null default false,
  permitted_lanes    public.lane[] not null default '{explore,control,finish}',
  permitted_uses     jsonb not null default '{}'::jsonb,
  distribution       public.distribution_scope not null default 'cohort',
  expires_at         timestamptz,
  state              public.consent_state not null default 'pending',
  signed_at          timestamptz,
  revoked_at         timestamptz,
  revoked_reason     text,
  created_by         uuid references public.users (id),
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  foreign key (org_id, project_id)     references public.projects      (org_id, id) on delete cascade,
  foreign key (org_id, bible_entry_id) references public.bible_entries (org_id, id) on delete cascade,
  check (state <> 'signed'  or signed_at  is not null),
  check (state <> 'revoked' or revoked_at is not null),
  check (not subject_is_minor or is_guardian),
  check (cardinality(permitted_lanes) > 0)
);
comment on column public.consent_releases.rights_holder_name is 'Who signed: the subject, or the guardian when is_guardian.';
comment on column public.consent_releases.permitted_lanes    is 'Lanes this release permits. voice_likeness must be listed explicitly for voice/face work.';
comment on column public.consent_releases.permitted_uses     is '{"transformations": [...], "model_version_slugs": [...] | null = any approved}. Recorded, enforced by the orchestrator gate.';
comment on column public.consent_releases.distribution       is 'Widest distribution the release allows. Release gate (§27) compares against the publication.';
create index consent_releases_entry_idx on public.consent_releases (bible_entry_id);
create trigger consent_releases_set_updated_at before update on public.consent_releases
  for each row execute function eduai.set_updated_at();

-- Derived consent state for a bible entry in a given lane.
-- Priority: revoked > signed(valid, covers lane) > expired > pending > missing. 'not_required' when no real person.
create or replace function eduai.bible_consent_state(p_entry uuid, p_lane public.lane default 'explore') returns text
language sql stable security definer set search_path = public as $$
  select case
    when not e.requires_consent then 'not_required'
    when exists (select 1 from public.consent_releases r where r.bible_entry_id = e.id and r.state = 'revoked') then 'revoked'
    when exists (select 1 from public.consent_releases r where r.bible_entry_id = e.id and r.state = 'signed'
                   and (r.expires_at is null or r.expires_at > now()) and p_lane = any (r.permitted_lanes)) then 'signed'
    when exists (select 1 from public.consent_releases r where r.bible_entry_id = e.id and r.state = 'signed'
                   and r.expires_at is not null and r.expires_at <= now()) then 'expired'
    when exists (select 1 from public.consent_releases r where r.bible_entry_id = e.id and r.state = 'signed') then 'lane_not_permitted'
    when exists (select 1 from public.consent_releases r where r.bible_entry_id = e.id and r.state = 'pending') then 'pending'
    else 'missing'
  end
  from public.bible_entries e where e.id = p_entry
$$;

create view public.bible_entry_status with (security_invoker = true) as
select e.*,
       eduai.bible_consent_state(e.id, 'explore') as consent_state,
       (not e.requires_consent or eduai.bible_consent_state(e.id, 'explore') = 'signed') as generation_allowed
from public.bible_entries e;
