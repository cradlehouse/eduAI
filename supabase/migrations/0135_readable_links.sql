-- Readable links: imaje.app/c/autumn-2026 and imaje.app/p/last-call instead of database IDs. Cohorts get
-- a slug; production slugs become unique within the school (they were unique per cohort), so a link
-- names one thing. Both are filled in from the name when a row is made without one. Old ID links keep
-- working: the web app's middleware redirects them. Access is unchanged (RLS on every query).

create or replace function eduai.slug_base(p_name text) returns text language sql immutable as $$
  select coalesce(nullif(left(trim(both '-' from regexp_replace(lower(coalesce(p_name, '')), '[^a-z0-9]+', '-', 'g')), 50), ''), 'untitled')
$$;

-- The first free slug in the org for this table: base, base-2, base-3 …
create or replace function eduai.free_slug(p_table text, p_org uuid, p_base text, p_self uuid) returns text
language plpgsql stable security definer set search_path = public as $$
declare
  cand text := case when length(p_base) < 2 then p_base || '-x' else p_base end;
  n int := 1;
  taken boolean;
begin
  loop
    execute format('select exists (select 1 from public.%I where org_id = $1 and slug = $2 and id is distinct from $3)', p_table)
      into taken using p_org, cand, p_self;
    exit when not taken;
    n := n + 1;
    cand := left(p_base, 50) || '-' || n;
  end loop;
  return cand;
end $$;

-- Cohorts: add, backfill, require.
alter table public.cohorts add column slug text;
update public.cohorts c set slug = eduai.free_slug('cohorts', c.org_id, eduai.slug_base(c.name), c.id)
  from (select id from public.cohorts order by created_at) o where o.id = c.id;
alter table public.cohorts alter column slug set not null;
alter table public.cohorts add constraint cohorts_slug_format check (slug ~ '^[a-z0-9][a-z0-9-]{1,59}$');
alter table public.cohorts add constraint cohorts_org_slug unique (org_id, slug);

-- Productions: unique within the school, not just the cohort. Any clash gets a -2 (none at the time of writing).
update public.projects p set slug = eduai.free_slug('projects', p.org_id, p.slug, p.id)
  where exists (select 1 from public.projects q where q.org_id = p.org_id and q.slug = p.slug and q.created_at < p.created_at);
alter table public.projects add constraint projects_org_slug unique (org_id, slug);

-- Made without a slug (or with a taken one): take the name's, made unique.
create or replace function eduai.fill_slug() returns trigger language plpgsql as $$
begin
  if new.slug is null or new.slug = '' or exists (
       select 1 from public.cohorts where tg_table_name = 'cohorts' and org_id = new.org_id and slug = new.slug and id <> new.id
       union all
       select 1 from public.projects where tg_table_name = 'projects' and org_id = new.org_id and slug = new.slug and id <> new.id) then
    new.slug := eduai.free_slug(tg_table_name, new.org_id,
                  eduai.slug_base(case when tg_table_name = 'cohorts' then (to_jsonb(new) ->> 'name') else (to_jsonb(new) ->> 'title') end),
                  new.id);
  end if;
  return new;
end $$;
create trigger cohorts_fill_slug before insert on public.cohorts for each row execute function eduai.fill_slug();
create trigger projects_fill_slug before insert on public.projects for each row execute function eduai.fill_slug();
