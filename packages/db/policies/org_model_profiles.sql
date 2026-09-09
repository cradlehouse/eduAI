create policy org_model_profiles_select on public.org_model_profiles for select to authenticated
  using (eduai.is_org_member(org_id));
create policy org_model_profiles_write on public.org_model_profiles for all to authenticated
  using (eduai.is_org_admin(org_id)) with check (eduai.is_org_admin(org_id) and approved_by = auth.uid());
