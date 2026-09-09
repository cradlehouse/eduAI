-- readable including drafts/retired so the UI can explain why a tile is locked
create policy model_versions_select on public.model_versions for select to authenticated using (true);
