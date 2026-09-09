-- registry is global and readable; every write is service role (seed / admin tooling)
create policy models_select on public.models for select to authenticated using (true);
