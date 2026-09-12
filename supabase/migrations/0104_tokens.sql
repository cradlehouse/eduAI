-- 0104: tokens. Students and instructors see budgets, spend and estimates in TOKENS.
-- Only org admins/owners see money and the tokens↔money rate. The ledger stays in cents
-- (vendor truth); conversion happens in views at read time.

alter table public.orgs
  add column tokens_per_dollar integer not null default 1000 check (tokens_per_dollar > 0);
comment on column public.orgs.tokens_per_dollar is 'Admin-only exchange rate. Default 1000: $1 = 1,000 tokens, so a $600 project budget is 600,000 tokens and a 5 s draft clip (~$0.20) is ~200.';

-- cents → tokens (floor for totals, ceil for spend so spend never rounds to zero)
create or replace function eduai.tokens_floor(p_cents integer, p_tpd integer) returns integer
language sql immutable as $$ select floor(coalesce(p_cents, 0)::numeric * p_tpd / 100)::integer $$;
create or replace function eduai.tokens_ceil(p_cents integer, p_tpd integer) returns integer
language sql immutable as $$ select ceil(coalesce(p_cents, 0)::numeric * p_tpd / 100)::integer $$;

-- The cents views become internal: used by eduai.reserve_job (definer) and the admin views below.
revoke select on public.project_budget_status, public.personal_budget_status from anon, authenticated;
-- …and they now run as their owner, not the caller: the token views above them do the access check,
-- and a caller who can no longer read the ledger must still get correct spend figures.
alter view public.project_budget_status  set (security_invoker = false);
alter view public.personal_budget_status set (security_invoker = false);

-- Ledger: admins only. Everyone else reads tokens through the views.
drop policy if exists ledger_select on public.ledger;
create policy ledger_select on public.ledger for select to authenticated
  using (eduai.is_org_admin(org_id));

-- jobs / job_receipts: hide the cents columns from non-admins with column-level grants.
-- Clients must select explicit columns (never `*`) on these two tables.
revoke select on public.jobs from anon, authenticated;
grant select (id, org_id, cohort_id, project_id, shot_id, kind, lane, deployment_profile_id, model_version_id,
              requested_by, inputs, status, priority, attempts, claimed_at, submitted_at, provider,
              provider_request_id, cost_unknown, settled_at, completed_at, policy_rejection, error, created_at, updated_at)
  on public.jobs to authenticated;
grant insert, update on public.jobs to authenticated;   -- RLS policies still gate rows
revoke select on public.job_receipts from anon, authenticated;
grant select (job_id, org_id, model_version_id, deployment_profile_id, lane, inputs, consent_basis, policy_decisions,
              cost_unknown, output_hashes, provenance, resource_estimate, created_at)
  on public.job_receipts to authenticated;

-- Token views. Definer-style (view owner reads the tables); the WHERE clause is the access check.
create view public.project_tokens as
select s.project_id, s.org_id, s.cohort_id,
       eduai.tokens_floor(s.total_cents, o.tokens_per_dollar)                                            as total_tokens,
       eduai.tokens_ceil(s.spent_cents, o.tokens_per_dollar)                                             as spent_tokens,
       eduai.tokens_floor(s.total_cents, o.tokens_per_dollar) - eduai.tokens_ceil(s.spent_cents, o.tokens_per_dollar) as remaining_tokens,
       eduai.tokens_ceil(s.reserved_open_cents, o.tokens_per_dollar)                                     as reserved_open_tokens
from public.project_budget_status s
join public.orgs o on o.id = s.org_id
where eduai.can_access_project(s.project_id);

create view public.personal_tokens as
select s.cohort_id, s.user_id, s.org_id,
       eduai.tokens_floor(s.total_cents, o.tokens_per_dollar)                                            as total_tokens,
       eduai.tokens_ceil(s.spent_cents, o.tokens_per_dollar)                                             as spent_tokens,
       eduai.tokens_floor(s.total_cents, o.tokens_per_dollar) - eduai.tokens_ceil(s.spent_cents, o.tokens_per_dollar) as remaining_tokens,
       eduai.tokens_ceil(s.reserved_open_cents, o.tokens_per_dollar)                                     as reserved_open_tokens
from public.personal_budget_status s
join public.orgs o on o.id = s.org_id
where s.user_id = auth.uid() or eduai.can_manage_cohort(s.cohort_id);

create view public.job_tokens as
select j.id as job_id, j.org_id, j.project_id, j.shot_id, j.lane, j.status, j.cost_unknown, j.created_at,
       case when j.estimated_cents is null then null else eduai.tokens_ceil(j.estimated_cents, o.tokens_per_dollar) end as estimated_tokens,
       case when j.actual_cents    is null then null else eduai.tokens_ceil(j.actual_cents,    o.tokens_per_dollar) end as actual_tokens
from public.jobs j
join public.orgs o on o.id = j.org_id
where eduai.can_access_project(j.project_id);

-- Admin money views: cents, tokens and the rate side by side.
create view public.project_budget_admin as
select s.*, o.tokens_per_dollar,
       eduai.tokens_floor(s.total_cents, o.tokens_per_dollar) as total_tokens,
       eduai.tokens_ceil(s.spent_cents,  o.tokens_per_dollar) as spent_tokens
from public.project_budget_status s
join public.orgs o on o.id = s.org_id
where eduai.is_org_admin(s.org_id);

create view public.personal_budget_admin as
select s.*, o.tokens_per_dollar,
       eduai.tokens_floor(s.total_cents, o.tokens_per_dollar) as total_tokens,
       eduai.tokens_ceil(s.spent_cents,  o.tokens_per_dollar) as spent_tokens
from public.personal_budget_status s
join public.orgs o on o.id = s.org_id
where eduai.is_org_admin(s.org_id);

grant select on public.project_tokens, public.personal_tokens, public.job_tokens,
                public.project_budget_admin, public.personal_budget_admin to authenticated;
revoke select on public.project_tokens, public.personal_tokens, public.job_tokens,
                 public.project_budget_admin, public.personal_budget_admin from anon;

-- Instructors set budgets in tokens; this converts once so project_budgets stays in cents.
create or replace function public.set_project_budget_tokens(p_project uuid, p_tokens integer)
returns integer
language plpgsql security definer set search_path = public as $$
declare v_org uuid; v_rate integer; v_cents integer;
begin
  if p_tokens < 0 then raise exception 'negative_budget'; end if;
  select org_id into v_org from public.projects where id = p_project;
  if v_org is null then raise exception 'project_not_found' using errcode = 'P0002'; end if;
  if not eduai.can_manage_project(p_project) then raise exception 'not_allowed' using errcode = '42501'; end if;
  select tokens_per_dollar into v_rate from public.orgs where id = v_org;
  v_cents := ceil(p_tokens::numeric * 100 / v_rate)::integer;
  insert into public.project_budgets (org_id, project_id, total_cents) values (v_org, p_project, v_cents)
  on conflict (project_id) do update set total_cents = excluded.total_cents;
  return v_cents;
end $$;
revoke all on function public.set_project_budget_tokens(uuid, integer) from public, anon, authenticated;
grant execute on function public.set_project_budget_tokens(uuid, integer) to authenticated;
