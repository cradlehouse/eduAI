create policy cohort_modules_select on public.cohort_modules for select to authenticated
  using (eduai.can_view_cohort(cohort_id));
create policy cohort_modules_insert on public.cohort_modules for insert to authenticated
  with check (eduai.is_org_admin(org_id));
-- instructors adjust dates and unlock gates for their cohorts
create policy cohort_modules_update on public.cohort_modules for update to authenticated
  using (eduai.can_manage_cohort(cohort_id)) with check (eduai.can_manage_cohort(cohort_id));
create policy cohort_modules_delete on public.cohort_modules for delete to authenticated
  using (eduai.is_org_admin(org_id));
