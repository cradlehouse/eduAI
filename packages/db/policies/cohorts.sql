create policy cohorts_select on public.cohorts for select to authenticated
  using (eduai.can_view_cohort(id));
create policy cohorts_write on public.cohorts for all to authenticated
  using (eduai.is_org_admin(org_id)) with check (eduai.is_org_admin(org_id));
