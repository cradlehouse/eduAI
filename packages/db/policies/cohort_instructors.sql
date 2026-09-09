create policy cohort_instructors_select on public.cohort_instructors for select to authenticated
  using (eduai.can_view_cohort(cohort_id));
create policy cohort_instructors_write on public.cohort_instructors for all to authenticated
  using (eduai.is_org_admin(org_id)) with check (eduai.is_org_admin(org_id));
