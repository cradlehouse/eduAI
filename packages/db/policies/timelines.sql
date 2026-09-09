create policy timelines_select on public.timelines for select to authenticated
  using (eduai.can_access_project(project_id));
create policy timelines_insert on public.timelines for insert to authenticated
  with check (eduai.can_access_project(project_id) and created_by = auth.uid());
create policy timelines_update on public.timelines for update to authenticated
  using (eduai.can_access_project(project_id)) with check (eduai.can_access_project(project_id));
-- no delete: versions are history
