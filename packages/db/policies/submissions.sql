create policy submissions_select on public.submissions for select to authenticated
  using (eduai.can_access_project(project_id));
create policy submissions_insert on public.submissions for insert to authenticated
  with check (eduai.can_access_project(project_id) and submitted_by = auth.uid() and status = 'submitted');
-- review is an instructor/admin act
create policy submissions_update on public.submissions for update to authenticated
  using (eduai.can_manage_project(project_id)) with check (eduai.can_manage_project(project_id));
