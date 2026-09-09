create policy modules_select on public.modules for select to authenticated
  using (eduai.is_org_member(org_id));
create policy modules_write on public.modules for all to authenticated
  using (eduai.is_org_admin(org_id)) with check (eduai.is_org_admin(org_id));
