create policy takes_select on public.takes for select to authenticated
  using (eduai.can_access_project(project_id));
-- kill / notes only; inserts come from the orchestrator at settle
create policy takes_update on public.takes for update to authenticated
  using (eduai.can_access_project(project_id)) with check (eduai.can_access_project(project_id));
