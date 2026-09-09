create policy bible_entries_select on public.bible_entries for select to authenticated
  using (eduai.can_access_project(project_id));
create policy bible_entries_insert on public.bible_entries for insert to authenticated
  with check (eduai.can_access_project(project_id) and created_by = auth.uid());
create policy bible_entries_update on public.bible_entries for update to authenticated
  using (eduai.can_access_project(project_id)) with check (eduai.can_access_project(project_id));
create policy bible_entries_delete on public.bible_entries for delete to authenticated
  using (eduai.can_access_project(project_id));
