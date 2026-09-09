-- 0008: jobs (the only contract between apps/web and the orchestrator), the versioned job event
-- log, the immutable job receipt, and the org-fair claim loop.

create type public.job_kind   as enum ('generate', 'render');
create type public.job_status as enum ('queued', 'claimed', 'submitted', 'running', 'succeeded',
                                       'failed', 'rejected', 'cancelled', 'timed_out');
create type public.job_event  as enum ('queued', 'claimed', 'submitted', 'accepted', 'running', 'output_received',
                                       'stored', 'policy_approved', 'policy_rejected', 'settled', 'failed',
                                       'timed_out', 'cancelled', 'unknown_cost');

create table public.jobs (
  id                    uuid primary key default gen_random_uuid(),
  org_id                uuid not null references public.orgs (id) on delete cascade,
  cohort_id             uuid not null,
  project_id            uuid not null,
  shot_id               uuid,
  kind                  public.job_kind not null default 'generate',
  lane                  public.lane,
  deployment_profile_id uuid references public.deployment_profiles (id),
  model_version_id      uuid references public.model_versions (id),
  requested_by          uuid not null references public.users (id),
  inputs                jsonb not null default '{}'::jsonb,
  status                public.job_status not null default 'queued',
  priority              smallint not null default 0,
  attempts              integer not null default 0,
  claimed_at            timestamptz,
  claimed_by            text,
  submitted_at          timestamptz,
  provider              text,
  provider_request_id   text,
  estimated_cents       integer check (estimated_cents >= 0),
  actual_cents          integer check (actual_cents >= 0),
  cost_unknown          boolean not null default false,
  settled_at            timestamptz,
  completed_at          timestamptz,
  policy_rejection      boolean not null default false,
  error                 text,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  foreign key (org_id, cohort_id)  references public.cohorts  (org_id, id) on delete cascade,
  foreign key (org_id, project_id) references public.projects (org_id, id) on delete cascade,
  foreign key (org_id, shot_id)    references public.shots    (org_id, id) on delete set null,
  unique (org_id, id),
  check (kind <> 'generate' or (deployment_profile_id is not null and model_version_id is not null and lane is not null and shot_id is not null))
);
comment on column public.jobs.inputs              is 'Validated by the orchestrator against model_versions.input_schema before submit.';
comment on column public.jobs.provider_request_id is 'Vendor id. Unique per provider so a replayed webhook maps to exactly one job.';
comment on column public.jobs.settled_at          is 'Set exactly once by eduai.settle_job. The idempotency guard against double-charging.';
comment on column public.jobs.cost_unknown        is 'Vendor reported no cost. Settled at the estimate; flagged for reconciliation.';
create unique index jobs_provider_request_idx on public.jobs (provider, provider_request_id)
  where provider_request_id is not null;
create index jobs_queue_idx    on public.jobs (kind, org_id, priority desc, created_at) where status = 'queued';
create index jobs_inflight_idx on public.jobs (org_id, kind) where status in ('claimed', 'submitted', 'running');
create index jobs_project_idx  on public.jobs (project_id, created_at desc);
create trigger jobs_set_updated_at before update on public.jobs
  for each row execute function eduai.set_updated_at();

alter table public.takes
  add constraint takes_job_fk foreign key (org_id, job_id) references public.jobs (org_id, id) on delete set null;
alter table public.assets
  add constraint assets_job_fk foreign key (org_id, job_id) references public.jobs (org_id, id) on delete set null;

create trigger model_versions_registry_guard before update on public.model_versions
  for each row execute function eduai.registry_guard();
create trigger deployment_profiles_registry_guard before update on public.deployment_profiles
  for each row execute function eduai.registry_guard();

-- Versioned lifecycle log. Append-only; schema_version lets payload shapes evolve without a migration.
create table public.job_events (
  id             bigint generated always as identity primary key,
  org_id         uuid not null references public.orgs (id) on delete cascade,
  job_id         uuid not null,
  event          public.job_event not null,
  schema_version smallint not null default 1,
  payload        jsonb not null default '{}'::jsonb,
  actor          text not null default 'system',
  at             timestamptz not null default now(),
  foreign key (org_id, job_id) references public.jobs (org_id, id) on delete cascade
);
create index job_events_job_idx on public.job_events (job_id, at);

-- Immutable receipt, written once at settle: exactly what ran, under what basis, at what cost.
create table public.job_receipts (
  job_id                uuid primary key,
  org_id                uuid not null references public.orgs (id) on delete cascade,
  model_version_id      uuid references public.model_versions (id),
  deployment_profile_id uuid references public.deployment_profiles (id),
  lane                  public.lane,
  inputs                jsonb not null,
  consent_basis         jsonb not null default '[]'::jsonb,
  policy_decisions      jsonb not null default '{}'::jsonb,
  estimated_cents       integer,
  actual_cents          integer,
  cost_unknown          boolean not null default false,
  output_hashes         text[] not null default '{}',
  provenance            jsonb not null default '{}'::jsonb,
  created_at            timestamptz not null default now(),
  foreign key (org_id, job_id) references public.jobs (org_id, id) on delete cascade
);
comment on table public.job_receipts is 'One per settled job. Never updated. consent_basis = eduai.shot_consent_basis at settle time.';

create or replace function eduai.append_only() returns trigger
language plpgsql as $$
begin
  raise exception 'append_only: % rows are immutable', tg_table_name using errcode = 'P0001';
end $$;
create trigger job_events_append_only   before update or delete on public.job_events   for each row execute function eduai.append_only();
create trigger job_receipts_append_only before update or delete on public.job_receipts for each row execute function eduai.append_only();
create trigger assets_append_only       before update or delete on public.assets       for each row execute function eduai.append_only();

create or replace function eduai.job_event(p_job uuid, p_event public.job_event, p_payload jsonb default '{}'::jsonb, p_actor text default 'system')
returns void
language sql security definer set search_path = public as $$
  insert into public.job_events (org_id, job_id, event, payload, actor)
  select org_id, id, p_event, coalesce(p_payload, '{}'::jsonb), p_actor from public.jobs where id = p_job
$$;

-- Clients insert (project_id, shot_id, deployment_profile_id, lane, inputs) only; the rest is derived.
-- RLS WITH CHECK runs after this trigger, so a spoofed org_id is overwritten before it is checked.
create or replace function eduai.jobs_fill_defaults() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  select org_id, cohort_id into new.org_id, new.cohort_id from public.projects where id = new.project_id;
  if new.org_id is null then raise exception 'project_not_found' using errcode = 'P0002'; end if;
  if new.requested_by is null then new.requested_by := auth.uid(); end if;
  if new.deployment_profile_id is not null then
    select provider, model_version_id into new.provider, new.model_version_id
      from public.deployment_profiles where id = new.deployment_profile_id;
  end if;
  return new;
end $$;
create trigger jobs_fill_defaults before insert on public.jobs
  for each row execute function eduai.jobs_fill_defaults();

create or replace function eduai.jobs_log_queued() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.job_events (org_id, job_id, event, actor)
  values (new.org_id, new.id, 'queued', coalesce(new.requested_by::text, 'system'));
  return new;
end $$;
create trigger jobs_log_queued after insert on public.jobs
  for each row execute function eduai.jobs_log_queued();

-- Org-fair claim (spec §21.2): among orgs with queued work, pick the one with the fewest jobs
-- in flight (ties → oldest queued job), then its highest-priority, oldest queued job.
-- SKIP LOCKED so N workers never fight; a locked org falls through to the next.
create or replace function eduai.claim_job(p_kinds public.job_kind[], p_worker text)
returns public.jobs
language plpgsql security definer set search_path = public as $$
declare
  v_id  uuid;
  v_job public.jobs;
begin
  select j.id into v_id
  from (
    select q.org_id,
           (select count(*) from public.jobs a
             where a.org_id = q.org_id and a.kind = any (p_kinds)
               and a.status in ('claimed', 'submitted', 'running')) as in_flight,
           min(q.created_at) as oldest
    from public.jobs q
    where q.status = 'queued' and q.kind = any (p_kinds)
    group by q.org_id
    order by in_flight asc, oldest asc
  ) o
  cross join lateral (
    select id from public.jobs
    where org_id = o.org_id and status = 'queued' and kind = any (p_kinds)
    order by priority desc, created_at asc
    for update skip locked
    limit 1
  ) j
  limit 1;

  if v_id is null then return null; end if;

  update public.jobs
     set status = 'claimed', claimed_at = now(), claimed_by = p_worker, attempts = attempts + 1
   where id = v_id
   returning * into v_job;
  perform eduai.job_event(v_id, 'claimed', jsonb_build_object('worker', p_worker, 'attempt', v_job.attempts), p_worker);
  return v_job;
end $$;

create or replace function eduai.mark_submitted(p_job uuid, p_provider_request_id text)
returns void
language plpgsql security definer set search_path = public as $$
begin
  update public.jobs
     set status = 'submitted', submitted_at = now(), provider_request_id = p_provider_request_id
   where id = p_job and status = 'claimed';
  if found then perform eduai.job_event(p_job, 'submitted', jsonb_build_object('provider_request_id', p_provider_request_id)); end if;
end $$;

create or replace function eduai.mark_running(p_job uuid)
returns void
language plpgsql security definer set search_path = public as $$
begin
  update public.jobs set status = 'running' where id = p_job and status = 'submitted';
  if found then perform eduai.job_event(p_job, 'running'); end if;
end $$;
