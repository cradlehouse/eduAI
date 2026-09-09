create policy users_select on public.users for select to authenticated
  using (id = auth.uid() or eduai.shares_org_with(id));
create policy users_update on public.users for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());
-- insert happens via the auth.users trigger
