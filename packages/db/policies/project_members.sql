create policy project_members_select on public.project_members for select to authenticated
  using (eduai.can_access_project(project_id));
create policy project_members_write on public.project_members for all to authenticated
  using (eduai.can_manage_project(project_id)) with check (eduai.can_manage_project(project_id));
