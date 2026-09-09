create policy project_budgets_select on public.project_budgets for select to authenticated
  using (eduai.can_access_project(project_id));
create policy project_budgets_write on public.project_budgets for all to authenticated
  using (eduai.can_manage_project(project_id)) with check (eduai.can_manage_project(project_id));
