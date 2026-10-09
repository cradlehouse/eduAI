-- Planning a scene before it's set up (no location yet, or people the script names who aren't in it)
-- is allowed, but the student says why. The reason, who gave it and when stay on the scene, so the
-- instructor sees the choice rather than a skipped step. Scenes' existing RLS (scenes_all) covers it.
alter table public.scenes
  add column plan_note text check (plan_note is null or length(trim(plan_note)) between 3 and 500),
  add column plan_note_by uuid references public.users (id) on delete set null,
  add column plan_note_at timestamptz;
