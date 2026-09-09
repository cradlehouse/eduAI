create policy job_receipts_select on public.job_receipts for select to authenticated
  using (exists (select 1 from public.jobs j where j.id = job_id and eduai.can_access_project(j.project_id)));
-- written once by eduai.settle_job
