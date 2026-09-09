-- 0009: budgets, the immutable ledger, budget-status views, and reserve / settle / release.
-- Sign convention: ledger.cents is a debit against the envelope.
--   reserve = +estimated    settle = actual − estimated    release = −estimated    refund = −n (with note)
-- spent = Σ(reserve, settle, release, refund, adjust). The (job_id, kind) unique index makes replay safe;
-- the append-only trigger makes corrections new rows, never edits.

create type public.ledger_kind     as enum ('grant', 'reserve', 'settle', 'release', 'refund', 'adjust');
create type public.budget_envelope as enum ('project', 'personal');

create table public.project_budgets (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null references public.orgs (id) on delete cascade,
  project_id  uuid not null unique,
  total_cents integer not null check (total_cents >= 0),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  foreign key (org_id, project_id) references public.projects (org_id, id) on delete cascade
);
create trigger project_budgets_set_updated_at before update on public.project_budgets
  for each row execute function eduai.set_updated_at();

create table public.personal_budgets (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null references public.orgs (id) on delete cascade,
  cohort_id   uuid not null,
  user_id     uuid not null references public.users (id) on delete cascade,
  total_cents integer not null check (total_cents >= 0),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  foreign key (org_id, cohort_id) references public.cohorts (org_id, id) on delete cascade,
  unique (cohort_id, user_id)
);
create trigger personal_budgets_set_updated_at before update on public.personal_budgets
  for each row execute function eduai.set_updated_at();

create table public.ledger (
  id         uuid primary key default gen_random_uuid(),
  org_id     uuid not null references public.orgs (id) on delete cascade,
  cohort_id  uuid not null,
  project_id uuid,
  user_id    uuid references public.users (id),
  job_id     uuid,
  envelope   public.budget_envelope not null,
  kind       public.ledger_kind not null,
  cents      integer not null,
  note       text,
  created_at timestamptz not null default now(),
  foreign key (org_id, cohort_id)  references public.cohorts  (org_id, id) on delete cascade,
  foreign key (org_id, project_id) references public.projects (org_id, id) on delete cascade,
  foreign key (org_id, job_id)     references public.jobs     (org_id, id) on delete set null,
  check (kind not in ('reserve', 'settle', 'release') or job_id is not null),
  check (kind not in ('refund', 'adjust') or note is not null),
  check (envelope <> 'project'  or project_id is not null),
  check (envelope <> 'personal' or user_id    is not null)
);
comment on table public.ledger is 'Append-only (trigger-enforced). Corrections are refund/adjust rows with a note.';
create unique index ledger_job_kind_idx on public.ledger (job_id, kind) where job_id is not null and kind in ('reserve', 'settle', 'release');
create index ledger_project_idx on public.ledger (project_id) where project_id is not null;
create index ledger_user_idx    on public.ledger (cohort_id, user_id) where user_id is not null;
create trigger ledger_append_only before update or delete on public.ledger
  for each row execute function eduai.append_only();

create view public.project_budget_status with (security_invoker = true) as
select b.project_id,
       b.org_id,
       p.cohort_id,
       b.total_cents,
       coalesce(sum(l.cents) filter (where l.kind <> 'grant'), 0)::integer as spent_cents,
       b.total_cents - coalesce(sum(l.cents) filter (where l.kind <> 'grant'), 0)::integer as remaining_cents,
       coalesce(sum(l.cents) filter (where l.kind = 'reserve'
                 and not exists (select 1 from public.ledger s where s.job_id = l.job_id and s.kind in ('settle', 'release'))), 0)::integer as reserved_open_cents
from public.project_budgets b
join public.projects p on p.id = b.project_id
left join public.ledger l on l.project_id = b.project_id and l.envelope = 'project'
group by b.project_id, b.org_id, p.cohort_id, b.total_cents;

create view public.personal_budget_status with (security_invoker = true) as
select b.cohort_id,
       b.user_id,
       b.org_id,
       b.total_cents,
       coalesce(sum(l.cents) filter (where l.kind <> 'grant'), 0)::integer as spent_cents,
       b.total_cents - coalesce(sum(l.cents) filter (where l.kind <> 'grant'), 0)::integer as remaining_cents,
       coalesce(sum(l.cents) filter (where l.kind = 'reserve'
                 and not exists (select 1 from public.ledger s where s.job_id = l.job_id and s.kind in ('settle', 'release'))), 0)::integer as reserved_open_cents
from public.personal_budgets b
left join public.ledger l on l.cohort_id = b.cohort_id and l.user_id = b.user_id and l.envelope = 'personal'
group by b.cohort_id, b.user_id, b.org_id, b.total_cents;

-- Which envelope a job debits: the project's, if it has a budget; else the requester's personal one.
create or replace function eduai.job_envelope(p_job uuid) returns public.budget_envelope
language sql stable security definer set search_path = public as $$
  select case
    when exists (select 1 from public.project_budgets b join public.jobs j on j.project_id = b.project_id where j.id = p_job)
      then 'project'::public.budget_envelope
    else 'personal'::public.budget_envelope
  end
$$;

-- Reserve the estimate against the envelope. Returns false (and records the estimate) when
-- there is no envelope or not enough left. Idempotent: a second call for a reserved job is true.
create or replace function eduai.reserve_job(p_job uuid, p_estimated_cents integer)
returns boolean
language plpgsql security definer set search_path = public as $$
declare
  v_job       public.jobs;
  v_env       public.budget_envelope;
  v_remaining integer;
begin
  if p_estimated_cents < 0 then raise exception 'negative_estimate'; end if;

  select * into v_job from public.jobs where id = p_job for update;
  if not found then raise exception 'job_not_found' using errcode = 'P0002'; end if;
  if exists (select 1 from public.ledger where job_id = p_job and kind = 'reserve') then return true; end if;

  update public.jobs set estimated_cents = p_estimated_cents where id = p_job;
  v_env := eduai.job_envelope(p_job);

  if v_env = 'project' then
    perform 1 from public.project_budgets where project_id = v_job.project_id for update;
    select remaining_cents into v_remaining from public.project_budget_status where project_id = v_job.project_id;
  else
    perform 1 from public.personal_budgets where cohort_id = v_job.cohort_id and user_id = v_job.requested_by for update;
    if not found then return false; end if;
    select remaining_cents into v_remaining from public.personal_budget_status
     where cohort_id = v_job.cohort_id and user_id = v_job.requested_by;
  end if;

  if p_estimated_cents > coalesce(v_remaining, 0) then return false; end if;

  insert into public.ledger (org_id, cohort_id, project_id, user_id, job_id, envelope, kind, cents)
  values (v_job.org_id, v_job.cohort_id, v_job.project_id, v_job.requested_by, p_job, v_env, 'reserve', p_estimated_cents);
  return true;
end $$;

-- Settle exactly once. A job succeeds only after its outputs are stored, scanned, approved and linked
-- to a take — the orchestrator does those inserts in the SAME transaction as this call, so a failure
-- in any of them rolls the settle back too. p_actual_cents null ⇒ cost unknown: charge the estimate, flag it.
-- Writes the immutable receipt (version, profile, inputs, consent basis, policy decisions, hashes, provenance).
create or replace function eduai.settle_job(p_job uuid, p_actual_cents integer, p_receipt jsonb default '{}'::jsonb)
returns boolean
language plpgsql security definer set search_path = public as $$
declare
  v_job   public.jobs;
  v_res   public.ledger;
  v_cents integer;
begin
  update public.jobs
     set status = 'succeeded', settled_at = now(), completed_at = now(),
         actual_cents = p_actual_cents, cost_unknown = (p_actual_cents is null)
   where id = p_job and settled_at is null
   returning * into v_job;
  if not found then return false; end if;

  select * into v_res from public.ledger where job_id = p_job and kind = 'reserve';
  v_cents := coalesce(p_actual_cents, v_job.estimated_cents, 0);

  insert into public.ledger (org_id, cohort_id, project_id, user_id, job_id, envelope, kind, cents, note)
  values (v_job.org_id, v_job.cohort_id, v_job.project_id, v_job.requested_by, p_job,
          coalesce(v_res.envelope, eduai.job_envelope(p_job)), 'settle',
          v_cents - coalesce(v_res.cents, 0),
          case when p_actual_cents is null then 'cost unknown: settled at estimate' end)
  on conflict (job_id, kind) where job_id is not null and kind in ('reserve', 'settle', 'release') do nothing;

  insert into public.job_receipts (job_id, org_id, model_version_id, deployment_profile_id, lane, inputs,
                                   consent_basis, policy_decisions, estimated_cents, actual_cents, cost_unknown,
                                   output_hashes, provenance)
  values (p_job, v_job.org_id, v_job.model_version_id, v_job.deployment_profile_id, v_job.lane, v_job.inputs,
          coalesce(p_receipt -> 'consent_basis',
                   case when v_job.shot_id is not null then eduai.shot_consent_basis(v_job.shot_id, coalesce(v_job.lane, 'explore')) end,
                   '[]'::jsonb),
          coalesce(p_receipt -> 'policy_decisions', '{}'::jsonb),
          v_job.estimated_cents, p_actual_cents, p_actual_cents is null,
          coalesce((select array_agg(x) from jsonb_array_elements_text(p_receipt -> 'output_hashes') x), '{}'),
          coalesce(p_receipt -> 'provenance', '{}'::jsonb))
  on conflict (job_id) do nothing;

  perform eduai.job_event(p_job, 'settled', jsonb_build_object('actual_cents', p_actual_cents, 'estimated_cents', v_job.estimated_cents));
  if p_actual_cents is null then perform eduai.job_event(p_job, 'unknown_cost'); end if;
  return true;
end $$;

-- Terminal failure: mark the job and give the reservation back. Safe with no reservation
-- (gate failures before reserve) and safe to call twice (no-op on already-terminal jobs).
create or replace function eduai.release_job(p_job uuid, p_status public.job_status default 'failed', p_error text default null)
returns boolean
language plpgsql security definer set search_path = public as $$
declare
  v_job public.jobs;
begin
  if p_status not in ('failed', 'rejected', 'cancelled', 'timed_out') then raise exception 'release_status_invalid'; end if;

  update public.jobs
     set status = p_status,
         error = coalesce(p_error, error),
         completed_at = coalesce(completed_at, now()),
         policy_rejection = policy_rejection or p_status = 'rejected'
   where id = p_job and settled_at is null
     and status not in ('succeeded', 'failed', 'rejected', 'cancelled', 'timed_out')   -- already terminal ⇒ no-op
   returning * into v_job;
  if not found then return false; end if;

  insert into public.ledger (org_id, cohort_id, project_id, user_id, job_id, envelope, kind, cents)
  select r.org_id, r.cohort_id, r.project_id, r.user_id, r.job_id, r.envelope, 'release', -r.cents
    from public.ledger r
   where r.job_id = p_job and r.kind = 'reserve'
  on conflict (job_id, kind) where job_id is not null and kind in ('reserve', 'settle', 'release') do nothing;

  perform eduai.job_event(p_job, case p_status when 'rejected' then 'policy_rejected'::public.job_event
                                              when 'cancelled' then 'cancelled' when 'timed_out' then 'timed_out'
                                              else 'failed' end,
                         jsonb_build_object('error', p_error));
  return true;
end $$;
