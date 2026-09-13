-- 0114 (P1-15): per-org, per-day job metrics for operations. Cents are here, so this is service-role only;
-- the web tier shows tokens through the budget views, never this.
create or replace view public.org_job_metrics as
select j.org_id, date_trunc('day', j.created_at)::date as day, j.provider, j.lane, j.layer,
       count(*)::int                                             as jobs,
       count(*) filter (where j.status = 'succeeded')::int       as succeeded,
       count(*) filter (where j.policy_rejection)::int           as policy_rejected,
       count(*) filter (where j.status in ('failed', 'timed_out'))::int as failed,
       count(*) filter (where j.cost_unknown)::int               as cost_unknown,
       coalesce(sum(j.estimated_cents), 0)::bigint               as estimated_cents,
       coalesce(sum(j.actual_cents), 0)::bigint                  as actual_cents,
       avg(extract(epoch from (j.completed_at - j.submitted_at))) filter (where j.status = 'succeeded') as avg_seconds
from public.jobs j
group by 1, 2, 3, 4, 5;
revoke all on public.org_job_metrics from public, anon, authenticated;
grant select on public.org_job_metrics to service_role;
