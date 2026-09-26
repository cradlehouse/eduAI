-- 0124: script first (docs/UX_WALKTHROUGH.md). A project holds its script; a breakdown of that script
-- proposes characters, locations and props (bible entries, each with an appearance prompt the student
-- writes or edits) and scenes that know where they are set, when, and who and what is in them.
-- Cuts made in a scene inherit its location, cast and props as their bible links.

alter table public.projects
  add column script            text not null default '',
  add column script_updated_at timestamptz;

alter table public.bible_entries
  add column appearance text not null default '',
  add column source      text not null default 'manual' check (source in ('manual', 'script'));
comment on column public.bible_entries.appearance is 'What it looks like, written as a prompt: "woman, 30s, long straight dark hair, glasses, grey coat". Description holds who/what it is.';

alter table public.scenes
  add column heading           text not null default '',
  add column time_of_day       text not null default '',
  add column location_entry_id uuid,
  add column script_excerpt    text not null default '',
  add constraint scenes_location_fk foreign key (org_id, location_entry_id) references public.bible_entries (org_id, id) on delete set null;

-- Who and what is in a scene (characters and props; the location is scenes.location_entry_id).
create table public.scene_bible_entries (
  org_id         uuid not null,
  scene_id       uuid not null,
  bible_entry_id uuid not null,
  created_at     timestamptz not null default now(),
  primary key (scene_id, bible_entry_id),
  foreign key (org_id, scene_id)       references public.scenes        (org_id, id) on delete cascade,
  foreign key (org_id, bible_entry_id) references public.bible_entries (org_id, id) on delete cascade
);
alter table public.scene_bible_entries enable row level security;
create policy scene_bible_entries_all on public.scene_bible_entries for all to authenticated
  using (exists (select 1 from public.scenes s where s.id = scene_id and eduai.can_access_project(s.project_id)))
  with check (exists (select 1 from public.scenes s where s.id = scene_id and eduai.can_access_project(s.project_id)));
grant select, insert, delete on public.scene_bible_entries to authenticated;
revoke all on public.scene_bible_entries from anon;
