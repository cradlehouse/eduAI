create policy assets_select on public.assets for select to authenticated
  using (case when project_id is null then eduai.is_org_admin(org_id) else eduai.can_access_project(project_id) end);
-- users upload; generated/rendered assets come from the orchestrator (service role)
create policy assets_insert on public.assets for insert to authenticated
  with check (project_id is not null and eduai.can_access_project(project_id)
              and source = 'uploaded' and created_by = auth.uid());
-- immutable: no update/delete
