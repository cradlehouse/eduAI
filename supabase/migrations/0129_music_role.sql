-- 0129: the film's music is made like room tone, on a hidden 'style' entry named "Music" (Edit page);
-- its results are role 'music'. Both role checks gain it; nothing else changes.
alter table public.jobs drop constraint jobs_entry_role_check;
alter table public.jobs add constraint jobs_entry_role_check check (entry_role is null or entry_role in
  ('master', 'angle', 'face', 'body', 'wardrobe', 'profile', 'expression', 'test', 'look', 'turnaround', 'time', 'voice', 'room', 'upload', 'music'));

alter table public.bible_entry_assets drop constraint bible_entry_assets_role_check;
alter table public.bible_entry_assets add constraint bible_entry_assets_role_check check (role in
  ('master', 'angle', 'face', 'body', 'wardrobe', 'profile', 'expression', 'test', 'look', 'turnaround', 'time', 'voice', 'room', 'upload', 'music'));
