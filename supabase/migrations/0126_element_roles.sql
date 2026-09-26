-- 0126: the element pages (Cast, Locations, Props) make more kinds of thing than 0121 knew about:
-- looks, turnarounds, times of day, voice samples, room tone, and the student's own start images.
alter table public.jobs drop constraint jobs_entry_role_check;
alter table public.jobs add constraint jobs_entry_role_check check (entry_role is null or entry_role in
  ('master', 'angle', 'face', 'body', 'wardrobe', 'profile', 'expression', 'test', 'look', 'turnaround', 'time', 'voice', 'room', 'upload'));

do $$
declare c text;
begin
  select conname into c from pg_constraint where conrelid = 'public.bible_entry_assets'::regclass and contype = 'c' and pg_get_constraintdef(oid) like '%role%';
  if c is not null then execute format('alter table public.bible_entry_assets drop constraint %I', c); end if;
end $$;
alter table public.bible_entry_assets add constraint bible_entry_assets_role_check check (role in
  ('master', 'angle', 'face', 'body', 'wardrobe', 'profile', 'expression', 'test', 'look', 'turnaround', 'time', 'voice', 'room', 'upload'));
