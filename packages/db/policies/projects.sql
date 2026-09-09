create policy projects_select on public.projects for select to authenticated
  using (eduai.can_access_project(id));
create policy projects_insert on public.projects for insert to authenticated
  with check (eduai.can_manage_cohort(cohort_id));
create policy projects_update on public.projects for update to authenticated
  using (eduai.can_access_project(id)) with check (eduai.can_access_project(id));
create policy projects_delete on public.projects for delete to authenticated
  using (eduai.can_manage_cohort(cohort_id));
