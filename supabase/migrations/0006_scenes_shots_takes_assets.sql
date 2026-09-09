-- 0006: assets (content-addressed, R2), scenes → shots → takes, shot↔bible links.
-- takes.job_id / assets.job_id FKs are added in 0008; takes.model_id in 0007.

create type public.asset_kind     as enum ('video', 'image', 'audio', 'document', 'render');
create type public.asset_source   as enum ('generated', 'uploaded', 'rendered');
create type public.take_lifecycle as enum ('live', 'killed', 'archived');

create table public.assets (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null references public.orgs (id) on delete cascade,
  project_id  uuid,
  kind        public.asset_kind not null,
  source      public.asset_source not null,
  r2_key      text not null,
  sha256      text not null check (sha256 ~ '^[0-9a-f]{64}$'),
  mime        text not null,
  bytes       bigint not null check (bytes >= 0),
  duration_s  numeric(10, 3),
  width       integer,
  height      integer,
  job_id      uuid,
  prev_hash   text,
  chain_hash  text,
  provenance  jsonb not null default '{}'::jsonb,
  created_by  uuid references public.users (id),
  created_at  timestamptz not null default now(),
  foreign key (org_id, project_id) references public.projects (org_id, id) on delete cascade,
  unique (org_id, sha256),
  unique (org_id, id)
);
comment on table  public.assets            is 'Immutable. r2_key is content-addressed: <org_id>/<sha256[0:2]>/<sha256>.<ext>.';
comment on column public.assets.prev_hash  is 'Provenance hash chain: chain_hash = sha256(prev_hash || sha256 || provenance). Written by the orchestrator at settle time.';
comment on column public.assets.provenance is 'model slug + version, inputs hash, provider request id, C2PA manifest ref, content-gate result.';
create index assets_project_idx on public.assets (project_id);

create table public.scenes (
  id         uuid primary key default gen_random_uuid(),
  org_id     uuid not null references public.orgs (id) on delete cascade,
  project_id uuid not null,
  position   integer not null check (position > 0),
  title      text not null,
  synopsis   text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (org_id, project_id) references public.projects (org_id, id) on delete cascade,
  unique (project_id, position) deferrable initially deferred,
  unique (org_id, id)
);
create trigger scenes_set_updated_at before update on public.scenes
  for each row execute function eduai.set_updated_at();

create table public.shots (
  id                uuid primary key default gen_random_uuid(),
  org_id            uuid not null references public.orgs (id) on delete cascade,
  project_id        uuid not null,
  scene_id          uuid not null,
  position          integer not null check (position > 0),
  label             text not null default '',
  description       text not null default '',
  duration_target_s numeric(6, 2),
  intent            jsonb not null default '{}'::jsonb,
  selected_take_id  uuid,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  foreign key (org_id, project_id) references public.projects (org_id, id) on delete cascade,
  foreign key (org_id, scene_id)   references public.scenes   (org_id, id) on delete cascade,
  unique (scene_id, position) deferrable initially deferred,
  unique (org_id, id)
);
comment on column public.shots.intent is 'Shot intent, required before Generate (eduai.shot_ready): {"objective": text, "continuity": text (reference/continuity requirement, or "none"), "camera_language": text, "no_bible_assets": bool}. Affected bible assets live in shot_bible_entries.';
create trigger shots_set_updated_at before update on public.shots
  for each row execute function eduai.set_updated_at();

create table public.shot_bible_entries (
  org_id         uuid not null references public.orgs (id) on delete cascade,
  shot_id        uuid not null,
  bible_entry_id uuid not null,
  primary key (shot_id, bible_entry_id),
  foreign key (org_id, shot_id)        references public.shots         (org_id, id) on delete cascade,
  foreign key (org_id, bible_entry_id) references public.bible_entries (org_id, id) on delete cascade
);

create table public.takes (
  id         uuid primary key default gen_random_uuid(),
  org_id     uuid not null references public.orgs (id) on delete cascade,
  project_id uuid not null,
  shot_id    uuid not null,
  job_id     uuid,
  asset_id   uuid not null,
  model_id   uuid,
  lifecycle  public.take_lifecycle not null default 'live',
  killed_at  timestamptz,
  killed_by  uuid references public.users (id),
  notes      text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (org_id, project_id) references public.projects (org_id, id) on delete cascade,
  foreign key (org_id, shot_id)    references public.shots    (org_id, id) on delete cascade,
  foreign key (org_id, asset_id)   references public.assets   (org_id, id),
  unique (org_id, id),
  check (lifecycle <> 'killed' or killed_at is not null)
);
comment on table public.takes is 'Inserted by the orchestrator at settle. Users may only change lifecycle (kill).';
create index takes_shot_idx on public.takes (shot_id);
create trigger takes_set_updated_at before update on public.takes
  for each row execute function eduai.set_updated_at();

alter table public.shots
  add constraint shots_selected_take_fk
  foreign key (org_id, selected_take_id) references public.takes (org_id, id) on delete set null;

alter table public.bible_entries
  add column reference_asset_id uuid,
  add constraint bible_entries_reference_asset_fk
  foreign key (org_id, reference_asset_id) references public.assets (org_id, id) on delete set null;

alter table public.consent_releases
  add column file_asset_id uuid,
  add column source_asset_id uuid,
  add constraint consent_releases_file_asset_fk
  foreign key (org_id, file_asset_id) references public.assets (org_id, id),
  add constraint consent_releases_source_asset_fk
  foreign key (org_id, source_asset_id) references public.assets (org_id, id);
comment on column public.consent_releases.file_asset_id   is 'The signed release document.';
comment on column public.consent_releases.source_asset_id is 'The face/voice reference the release covers (when the release is asset-specific).';

-- Recreate the status view so it picks up reference_asset_id.
drop view public.bible_entry_status;
create view public.bible_entry_status with (security_invoker = true) as
select e.*,
       eduai.bible_consent_state(e.id, 'explore') as consent_state,
       (not e.requires_consent or eduai.bible_consent_state(e.id, 'explore') = 'signed') as generation_allowed
from public.bible_entries e;

-- Consent gate: every consent-bearing bible entry linked to the shot must have a valid release for the lane.
create or replace function eduai.shot_consent_ok(p_shot uuid, p_lane public.lane default 'explore') returns boolean
language sql stable security definer set search_path = public as $$
  select not exists (
    select 1
    from public.shot_bible_entries sbe
    join public.bible_entries e on e.id = sbe.bible_entry_id
    where sbe.shot_id = p_shot
      and e.requires_consent
      and eduai.bible_consent_state(e.id, p_lane) <> 'signed')
$$;

-- The consent basis a job is generated under: the release ids that currently permit each linked entry.
-- Frozen into job_receipts.consent_basis at settle so output carries the basis that applied at the time.
create or replace function eduai.shot_consent_basis(p_shot uuid, p_lane public.lane default 'explore') returns jsonb
language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(jsonb_build_object(
           'bible_entry_id', e.id, 'name', e.name, 'kind', e.kind,
           'state', eduai.bible_consent_state(e.id, p_lane),
           'release_ids', (select coalesce(jsonb_agg(r.id), '[]'::jsonb) from public.consent_releases r
                            where r.bible_entry_id = e.id and r.state = 'signed'
                              and (r.expires_at is null or r.expires_at > now()) and p_lane = any (r.permitted_lanes))
         )), '[]'::jsonb)
  from public.shot_bible_entries sbe
  join public.bible_entries e on e.id = sbe.bible_entry_id
  where sbe.shot_id = p_shot and e.requires_consent
$$;

-- Generate gate, shot side: intent fields present, bible assets declared, consent valid for the lane.
create or replace function eduai.shot_ready(p_shot uuid, p_lane public.lane default 'explore')
returns table (ready boolean, missing text[])
language plpgsql stable security definer set search_path = public as $$
declare
  s public.shots;
  m text[] := '{}';
begin
  select * into s from public.shots where id = p_shot;
  if not found then return query select false, array['shot_not_found']; return; end if;
  if coalesce(s.intent ->> 'objective', '') = ''        then m := array_append(m, 'objective'); end if;
  if coalesce(s.intent ->> 'continuity', '') = ''       then m := array_append(m, 'continuity'); end if;
  if coalesce(s.intent ->> 'camera_language', '') = ''  then m := array_append(m, 'camera_language'); end if;
  if not coalesce((s.intent ->> 'no_bible_assets')::boolean, false)
     and not exists (select 1 from public.shot_bible_entries where shot_id = p_shot) then
    m := array_append(m, 'bible_assets');
  end if;
  if not eduai.shot_consent_ok(p_shot, p_lane) then m := array_append(m, 'consent'); end if;
  return query select cardinality(m) = 0, m;
end $$;
