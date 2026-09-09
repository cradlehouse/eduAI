create policy memberships_select on public.memberships for select to authenticated
  using (eduai.is_org_member(org_id));
create policy memberships_insert on public.memberships for insert to authenticated
  with check (eduai.can_grant_role(org_id, role));
create policy memberships_update on public.memberships for update to authenticated
  using (role <> 'owner' and eduai.can_grant_role(org_id, role))
  with check (eduai.can_grant_role(org_id, role));
create policy memberships_delete on public.memberships for delete to authenticated
  using (role <> 'owner' and eduai.can_grant_role(org_id, role));
