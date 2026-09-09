create policy job_events_select on public.job_events for select to authenticated
  using (exists (select 1 from public.jobs j where j.id = job_id and eduai.can_access_project(j.project_id)));
-- append-only, written by eduai.* functions
