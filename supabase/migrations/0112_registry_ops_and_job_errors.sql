-- 0112: two things the first real generation (2026-09-13) taught us.
-- 1. compute_provider is descriptive (who runs the silicon), not identity: the hosted rows predated the
--    column, so every seed upsert tripped registry_guard and adapters never landed. Make it operational.
-- 2. Students and instructors need to see WHY a job failed (the vendor's message) — expose jobs.error
--    through job_tokens. Failed jobs already give their tokens back; the message closes the loop.
create or replace function eduai.registry_guard() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  mutable text[] := array['approval_status', 'approval_owner', 'approved_at', 'approved_until', 'notes',
                          'updated_at', 'enabled', 'health_status', 'adapter_tested_at', 'quota',
                          'resource_disclosure', 'resource_disclosure_source', 'energy_profile', 'resource_model',
                          'adapter', 'compute_provider'];
  in_use boolean;
begin
  if tg_table_name = 'model_versions' then
    in_use := exists (select 1 from public.jobs where model_version_id = old.id);
  else
    in_use := exists (select 1 from public.jobs where deployment_profile_id = old.id);
  end if;
  if in_use and (to_jsonb(old) - mutable) <> (to_jsonb(new) - mutable) then
    raise exception 'registry_record_in_use: % % is referenced by jobs; create a new record instead', tg_table_name, old.slug
      using errcode = 'P0001';
  end if;
  return new;
end $$;

drop view public.job_tokens;
create view public.job_tokens with (security_invoker = true) as
select j.id as job_id, j.org_id, j.project_id, j.shot_id, j.lane, j.layer, j.status, j.cost_unknown, j.created_at, j.error,
       case when j.estimated_cents is null then null else eduai.tokens_ceil(j.estimated_cents, o.tokens_per_dollar) end as estimated_tokens,
       case when j.actual_cents    is null then null else eduai.tokens_ceil(j.actual_cents,    o.tokens_per_dollar) end as actual_tokens
from public.jobs j
join public.orgs o on o.id = j.org_id
where eduai.can_access_project(j.project_id);
grant select on public.job_tokens to authenticated;
revoke select on public.job_tokens from anon;
grant select (error) on public.jobs to authenticated;
