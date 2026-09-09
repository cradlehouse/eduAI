create policy jobs_select on public.jobs for select to authenticated
  using (eduai.can_access_project(project_id));
-- org_id / cohort_id / provider are filled by the eduai.jobs_fill_defaults trigger before this check
create policy jobs_insert on public.jobs for insert to authenticated
  with check (eduai.can_access_project(project_id) and requested_by = auth.uid() and status = 'queued');
-- the only user-side transition: cancel while still queued
create policy jobs_cancel on public.jobs for update to authenticated
  using (requested_by = auth.uid() and status = 'queued')
  with check (requested_by = auth.uid() and status = 'cancelled');
