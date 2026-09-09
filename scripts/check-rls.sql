-- Fails the build if any public table lacks RLS, or lacks org_id without being on the
-- documented exception list. Run after all migrations.
do $$
declare
  bad text;
begin
  select string_agg(c.relname, ', ' order by c.relname) into bad
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and c.relkind in ('r', 'p') and not c.relrowsecurity;
  if bad is not null then
    raise exception 'RLS not enabled on: %', bad;
  end if;

  select string_agg(c.relname, ', ' order by c.relname) into bad
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and c.relkind in ('r', 'p')
    and c.relname not in ('orgs', 'users', 'models', 'model_versions', 'deployment_profiles', 'webhook_inbox')   -- the org itself, global identity, global registry (3), pre-org inbox
    and not exists (
      select 1 from pg_attribute a
      where a.attrelid = c.oid and a.attname = 'org_id' and a.attnotnull and not a.attisdropped);
  if bad is not null then
    raise exception 'tables missing a NOT NULL org_id: %', bad;
  end if;

  raise notice 'check-rls: every public table has RLS; org_id present where required';
end $$;
