-- secret_ref is a Vault id, not the secret; still admin-only. Revoke = update revoked_at; no delete.
create policy org_credentials_select on public.org_credentials for select to authenticated
  using (eduai.is_org_admin(org_id));
create policy org_credentials_insert on public.org_credentials for insert to authenticated
  with check (eduai.is_org_admin(org_id) and created_by = auth.uid());
create policy org_credentials_update on public.org_credentials for update to authenticated
  using (eduai.is_org_admin(org_id)) with check (eduai.is_org_admin(org_id));
