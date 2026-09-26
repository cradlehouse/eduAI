-- 0125: the production flow (docs/PRODUCTION_FLOW.md). One job per screen; the script stays in sync with
-- anything added anywhere; each character has a voice, each location a room tone; a talking clip's
-- sound is split into one track per character.

-- A character's voice sample (every line they say is converted to it) and a location's room tone
-- (laid under every shot there). Both are assets the entry owns.
alter table public.bible_entries
  add column voice_asset_id     uuid,
  add column room_tone_asset_id uuid,
  add constraint bible_entries_voice_fk foreign key (org_id, voice_asset_id) references public.assets (org_id, id) on delete set null,
  add constraint bible_entries_room_fk  foreign key (org_id, room_tone_asset_id) references public.assets (org_id, id) on delete set null;

-- Edit: per-track levels and trims. One document per project; the timeline order is scenes → shots.
alter table public.projects add column edit jsonb not null default '{}'::jsonb;

-- Every change the app writes into the script, so the Script page can say "added in Scene 2 · who ·
-- when" and undo it. snippet is the exact text inserted (undo removes it).
create table public.script_changes (
  id             uuid primary key default gen_random_uuid(),
  org_id         uuid not null references public.orgs (id),
  project_id     uuid not null,
  scene_position integer,
  source         text not null check (source in ('scene', 'cast', 'locations', 'props', 'script')),
  label          text not null default '',
  snippet        text not null default '',
  created_by     uuid references auth.users (id) default auth.uid(),
  created_at     timestamptz not null default now(),
  undone_at      timestamptz,
  foreign key (org_id, project_id) references public.projects (org_id, id) on delete cascade
);
create index script_changes_project on public.script_changes (project_id, created_at desc);
alter table public.script_changes enable row level security;
create policy script_changes_all on public.script_changes for all to authenticated
  using (eduai.can_access_project(project_id)) with check (eduai.can_access_project(project_id));
grant select, insert, update on public.script_changes to authenticated;
revoke all on public.script_changes from anon;

-- Scenes follow the script's order. Positions are unique (deferred), so reorder in one statement.
create or replace function public.set_scene_order(p_project uuid, p_ids uuid[])
returns void language sql security invoker set search_path = public as $$
  update public.scenes s set position = t.pos
  from unnest(p_ids) with ordinality as t(id, pos)
  where s.id = t.id and s.project_id = p_project
$$;
revoke all on function public.set_scene_order(uuid, uuid[]) from public, anon;
grant execute on function public.set_scene_order(uuid, uuid[]) to authenticated;

-- A clip's sound as separate tracks: one per character (converted to their voice), the room, the
-- original. Written by the orchestrator (service role); read by the crew.
create table public.take_tracks (
  id             uuid primary key default gen_random_uuid(),
  org_id         uuid not null references public.orgs (id),
  project_id     uuid not null,
  take_id        uuid not null,
  bible_entry_id uuid,
  kind           text not null check (kind in ('voice', 'room', 'original')),
  asset_id       uuid not null,
  spans          jsonb not null default '[]'::jsonb,
  job_id         uuid references public.jobs (id),
  created_at     timestamptz not null default now(),
  foreign key (org_id, project_id)     references public.projects      (org_id, id) on delete cascade,
  foreign key (org_id, take_id)        references public.takes         (org_id, id) on delete cascade,
  foreign key (org_id, bible_entry_id) references public.bible_entries (org_id, id) on delete set null,
  foreign key (org_id, asset_id)       references public.assets        (org_id, id)
);
create index take_tracks_take on public.take_tracks (take_id);
alter table public.take_tracks enable row level security;
create policy take_tracks_read on public.take_tracks for select to authenticated using (eduai.can_access_project(project_id));
grant select on public.take_tracks to authenticated;
revoke all on public.take_tracks from anon;

comment on table public.take_tracks is 'A talking clip split into tracks: LTX performs the lines, each speaker''s part is converted to their Cast voice (Chatterbox) and kept only where they speak.';
