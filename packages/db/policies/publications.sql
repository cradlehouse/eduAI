create policy publications_select on public.publications for select to authenticated
  using (eduai.can_access_project(project_id));
-- students never publish; the Release screen is the instructor's
create policy publications_insert on public.publications for insert to authenticated
  with check (eduai.can_manage_project(project_id) and created_by = auth.uid());
create policy publications_update on public.publications for update to authenticated
  using (eduai.can_manage_project(project_id)) with check (eduai.can_manage_project(project_id));
