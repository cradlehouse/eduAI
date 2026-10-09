-- Script drafts: numbered, read-only copies of the script, like a production's revision drafts. The
-- live script stays on projects.script; saving a draft copies it here with the next number. Drafts are
-- never edited or deleted (they're the history); going back to one copies its text into the live script
-- after saving the current one as a draft first. Anyone who can work on the project can save and read
-- them (crew, the cohort's instructors, org admins), per eduai.can_access_project.
create table public.script_drafts (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null references public.orgs (id),
  project_id  uuid not null,
  number      integer not null check (number > 0),
  script      text not null,
  -- Why it was saved: "New draft", "Before keeping a breakdown", "Before going back to Draft 2".
  reason      text not null default '' check (length(reason) <= 200),
  auto        boolean not null default false,
  created_by  uuid references auth.users (id) default auth.uid(),
  created_at  timestamptz not null default now(),
  unique (project_id, number),
  foreign key (org_id, project_id) references public.projects (org_id, id) on delete cascade
);
create index script_drafts_project on public.script_drafts (project_id, number desc);
alter table public.script_drafts enable row level security;
create policy script_drafts_select on public.script_drafts for select to authenticated using (eduai.can_access_project(project_id));
create policy script_drafts_insert on public.script_drafts for insert to authenticated with check (eduai.can_access_project(project_id));
grant select, insert on public.script_drafts to authenticated;
revoke all on public.script_drafts from anon;

-- Save the live script as the next draft, in one statement so two people can't take the same number.
-- Security invoker: the caller's own RLS on projects (read) and script_drafts (insert) applies.
create or replace function public.save_script_draft(p_project uuid, p_reason text, p_auto boolean default false)
returns integer language sql security invoker set search_path = public as $$
  insert into public.script_drafts (org_id, project_id, number, script, reason, auto)
  select p.org_id, p.id,
         coalesce((select max(d.number) from public.script_drafts d where d.project_id = p.id), 0) + 1,
         coalesce(p.script, ''), left(coalesce(p_reason, ''), 200), coalesce(p_auto, false)
  from public.projects p where p.id = p_project
  returning number
$$;
revoke all on function public.save_script_draft(uuid, text, boolean) from public, anon;
grant execute on function public.save_script_draft(uuid, text, boolean) to authenticated;
