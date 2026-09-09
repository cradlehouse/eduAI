create policy social_accounts_select on public.social_accounts for select to authenticated
  using (eduai.is_org_member(org_id) and (owner_user_id is null or owner_user_id = auth.uid() or eduai.is_org_admin(org_id)));
-- org accounts: admins. personal accounts: the member themself, never a minor (trigger enforces too)
create policy social_accounts_insert on public.social_accounts for insert to authenticated
  with check ((owner_user_id is null and eduai.is_org_admin(org_id))
              or (owner_user_id = auth.uid() and eduai.is_org_member(org_id) and not eduai.is_minor_in(org_id)));
create policy social_accounts_update on public.social_accounts for update to authenticated
  using ((owner_user_id is null and eduai.is_org_admin(org_id)) or owner_user_id = auth.uid())
  with check ((owner_user_id is null and eduai.is_org_admin(org_id)) or owner_user_id = auth.uid());
