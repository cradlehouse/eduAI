create policy orgs_select on public.orgs for select to authenticated
  using (eduai.is_org_member(id));
create policy orgs_update on public.orgs for update to authenticated
  using (eduai.is_org_admin(id)) with check (eduai.is_org_admin(id));
-- no insert/delete: orgs are created and deleted by service role (owner-only, out of band)
