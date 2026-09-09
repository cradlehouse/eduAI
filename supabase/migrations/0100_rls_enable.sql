-- 0100: enable RLS on every table in public. Loops rather than listing so a table can't be
-- missed; scripts/check-rls.sql fails CI if a later migration adds one without it.
do $$
declare t record;
begin
  for t in
    select c.relname
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind in ('r', 'p')
  loop
    execute format('alter table public.%I enable row level security', t.relname);
  end loop;
end $$;
