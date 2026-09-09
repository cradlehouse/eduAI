create policy consent_releases_select on public.consent_releases for select to authenticated
  using (eduai.can_access_project(project_id));
-- members upload a release (pending or signed); only instructors/admins change state afterwards (revoke)
create policy consent_releases_insert on public.consent_releases for insert to authenticated
  with check (eduai.can_access_project(project_id) and created_by = auth.uid() and state <> 'revoked');
create policy consent_releases_update on public.consent_releases for update to authenticated
  using (eduai.can_manage_project(project_id)) with check (eduai.can_manage_project(project_id));
-- no delete: releases are evidence
