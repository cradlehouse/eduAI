create policy courses_select on public.courses for select to authenticated
  using (eduai.is_org_member(org_id));
create policy courses_write on public.courses for all to authenticated
  using (eduai.is_org_admin(org_id)) with check (eduai.is_org_admin(org_id));
