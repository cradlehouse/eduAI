create policy invites_select on public.invites for select to authenticated
  using (eduai.is_org_admin(org_id));
create policy invites_insert on public.invites for insert to authenticated
  with check (eduai.can_grant_role(org_id, role) and invited_by = auth.uid());
create policy invites_update on public.invites for update to authenticated
  using (eduai.is_org_admin(org_id) and accepted_at is null)
  with check (eduai.can_grant_role(org_id, role));
create policy invites_delete on public.invites for delete to authenticated
  using (eduai.is_org_admin(org_id) and accepted_at is null);
-- acceptance runs through eduai.accept_invite under service role
