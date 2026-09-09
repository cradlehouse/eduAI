create policy scenes_all on public.scenes for all to authenticated
  using (eduai.can_access_project(project_id)) with check (eduai.can_access_project(project_id));
