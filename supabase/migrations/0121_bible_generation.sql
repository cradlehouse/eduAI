-- 0121: generate for a bible entry, not only for a cut (RENDER_PLAN step 2).
-- An environment is built before any cut exists: a master wide, then angles made from it. A
-- character is built from reference slots. Those generations are jobs whose target is a bible
-- entry; their outputs land in bible_entry_assets (role-tagged) instead of takes.
-- Environments also carry fixed conditions (time, light, weather, occupancy); changing them after
-- the entry has been used forks a new entry (forked_from) rather than mutating the one shots used.

alter table public.jobs
  add column bible_entry_id uuid,
  add column entry_role     text,
  add constraint jobs_bible_entry_fk foreign key (org_id, bible_entry_id) references public.bible_entries (org_id, id) on delete set null,
  add constraint jobs_entry_role_check check (entry_role is null or entry_role in ('master', 'angle', 'face', 'body', 'wardrobe', 'profile', 'expression', 'test'));
alter table public.jobs drop constraint jobs_check;
alter table public.jobs add constraint jobs_check check (
  kind <> 'generate' or (deployment_profile_id is not null and model_version_id is not null and lane is not null
                         and (shot_id is not null or bible_entry_id is not null)));
comment on column public.jobs.bible_entry_id is 'Set instead of shot_id when the generation builds a bible entry (an angle of an environment, a reference of a character).';

alter table public.bible_entries
  add column fixed       jsonb not null default '{}'::jsonb,
  add column forked_from uuid references public.bible_entries (id) on delete set null;
comment on column public.bible_entries.fixed is 'Environment conditions locked at save: {time, light, weather, occupancy}. Editing after first use forks.';

create table public.bible_entry_assets (
  id             uuid primary key default gen_random_uuid(),
  org_id         uuid not null,
  project_id     uuid not null,
  bible_entry_id uuid not null,
  asset_id       uuid not null,
  role           text not null check (role in ('master', 'angle', 'face', 'body', 'wardrobe', 'profile', 'expression', 'test')),
  label          text not null default '',
  params         jsonb not null default '{}'::jsonb,
  position       integer not null default 0,
  lifecycle      public.take_lifecycle not null default 'live',
  job_id         uuid,
  created_by     uuid,
  created_at     timestamptz not null default now(),
  foreign key (org_id, project_id)     references public.projects      (org_id, id) on delete cascade,
  foreign key (org_id, bible_entry_id) references public.bible_entries (org_id, id) on delete cascade,
  foreign key (org_id, asset_id)       references public.assets        (org_id, id),
  foreign key (org_id, job_id)         references public.jobs          (org_id, id) on delete set null
);
create index bible_entry_assets_entry on public.bible_entry_assets (bible_entry_id, role, position);
alter table public.bible_entry_assets enable row level security;
create policy bible_entry_assets_select on public.bible_entry_assets for select to authenticated
  using (eduai.can_access_project(project_id));
create policy bible_entry_assets_insert on public.bible_entry_assets for insert to authenticated
  with check (eduai.can_access_project(project_id) and created_by = auth.uid());
create policy bible_entry_assets_update on public.bible_entry_assets for update to authenticated
  using (eduai.can_access_project(project_id)) with check (eduai.can_access_project(project_id));
grant select, insert, update on public.bible_entry_assets to authenticated;
revoke all on public.bible_entry_assets from anon;

-- The console reads jobs through job_tokens; expose the entry target there too.
drop view public.job_tokens;
create view public.job_tokens with (security_invoker = true) as
select j.id as job_id, j.org_id, j.project_id, j.shot_id, j.bible_entry_id, j.entry_role, j.lane, j.layer, j.status, j.cost_unknown, j.created_at, j.error,
       case when j.estimated_cents is null then null else eduai.tokens_ceil(j.estimated_cents, o.tokens_per_dollar) end as estimated_tokens,
       case when j.actual_cents    is null then null else eduai.tokens_ceil(j.actual_cents,    o.tokens_per_dollar) end as actual_tokens
from public.jobs j
join public.orgs o on o.id = j.org_id
where eduai.can_access_project(j.project_id);
grant select on public.job_tokens to authenticated;
revoke select on public.job_tokens from anon;
