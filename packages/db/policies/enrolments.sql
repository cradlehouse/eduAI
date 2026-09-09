create policy enrolments_select on public.enrolments for select to authenticated
  using (user_id = auth.uid() or eduai.can_manage_cohort(cohort_id));
create policy enrolments_write on public.enrolments for all to authenticated
  using (eduai.is_org_admin(org_id)) with check (eduai.is_org_admin(org_id));
