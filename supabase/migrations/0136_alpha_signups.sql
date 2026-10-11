-- Alpha sign-ups from the public landing page (imaje.app/). Not an org's data: people asking to join the
-- alpha before they have an org, so no org_id (listed in scripts/check-rls.sql with the other pre-org
-- tables). RLS on with no policies: nobody reads or writes it through the API. The landing page calls
-- alpha_signup() below, which validates, takes each email once, and refuses floods. Read it in the
-- Supabase table editor (or a future admin page).
create table public.alpha_signups (
  id            uuid primary key default gen_random_uuid(),
  name          text not null check (length(trim(name)) between 1 and 120),
  email         text not null check (length(email) <= 200 and email ~* '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'),
  organisation  text not null default '' check (length(organisation) <= 200),
  role          text not null check (role in ('programme_lead', 'instructor', 'school_leader', 'parent', 'other')),
  students      text not null default '' check (length(students) <= 40),
  note          text not null default '' check (length(note) <= 1000),
  adult         boolean not null check (adult),
  source        text not null default 'landing' check (length(source) <= 40),
  created_at    timestamptz not null default now()
);
create unique index alpha_signups_email on public.alpha_signups (lower(email));
alter table public.alpha_signups enable row level security;
revoke all on public.alpha_signups from anon, authenticated;

create or replace function public.alpha_signup(p_name text, p_email text, p_organisation text, p_role text, p_students text, p_note text, p_adult boolean)
returns text language plpgsql security definer set search_path = public as $$
declare
  n int;
begin
  if not coalesce(p_adult, false) then raise exception 'adult'; end if;
  -- A crude flood guard: the page is public. (Turnstile is the proper fix; see the landing page notes.)
  select count(*) into n from public.alpha_signups where created_at > now() - interval '10 minutes';
  if n > 50 then raise exception 'busy'; end if;
  insert into public.alpha_signups (name, email, organisation, role, students, note, adult)
  values (trim(p_name), lower(trim(p_email)), trim(coalesce(p_organisation, '')), p_role, trim(coalesce(p_students, '')), trim(coalesce(p_note, '')), true)
  on conflict (lower(email)) do nothing;
  return case when found then 'added' else 'already' end;
end $$;
revoke all on function public.alpha_signup(text, text, text, text, text, text, boolean) from public;
grant execute on function public.alpha_signup(text, text, text, text, text, text, boolean) to anon, authenticated;
