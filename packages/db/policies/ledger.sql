create policy ledger_select on public.ledger for select to authenticated
  using ((project_id is not null and eduai.can_access_project(project_id))
         or user_id = auth.uid()
         or eduai.can_manage_cohort(cohort_id));
-- append-only, written by eduai.* functions under service role
