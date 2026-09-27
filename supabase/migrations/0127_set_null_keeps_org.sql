-- 0127: every composite (org_id, x) foreign key declared ON DELETE SET NULL also nulled org_id, which
-- is NOT NULL, so deleting the parent failed (found deleting a shot with jobs: "null value in column
-- org_id of relation jobs"). Postgres 15+ lets SET NULL name its columns: null only the pointer.
do $$
declare r record; col text;
begin
  for r in
    select c.conrelid::regclass as tbl, c.conname, pg_get_constraintdef(c.oid) as def
    from pg_constraint c
    where c.contype = 'f' and c.connamespace = 'public'::regnamespace
      and pg_get_constraintdef(c.oid) ~ '^FOREIGN KEY \(org_id, [a-z_]+\).* ON DELETE SET NULL$'
  loop
    col := substring(r.def from '^FOREIGN KEY \(org_id, ([a-z_]+)\)');
    execute format('alter table %s drop constraint %I', r.tbl, r.conname);
    execute format('alter table %s add constraint %I %s (%I)', r.tbl, r.conname, r.def, col);
  end loop;
end $$;
