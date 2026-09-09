create policy shots_all on public.shots for all to authenticated
  using (eduai.can_access_project(project_id)) with check (eduai.can_access_project(project_id));
