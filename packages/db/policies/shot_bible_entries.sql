create policy shot_bible_entries_all on public.shot_bible_entries for all to authenticated
  using (exists (select 1 from public.shots s where s.id = shot_id and eduai.can_access_project(s.project_id)))
  with check (exists (select 1 from public.shots s where s.id = shot_id and eduai.can_access_project(s.project_id)));
