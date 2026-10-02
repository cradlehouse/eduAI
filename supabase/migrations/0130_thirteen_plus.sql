-- Imaje is for people aged 13 and over (decided 2 Oct 2026): no under-13 accounts, so COPPA's
-- under-13 rules don't apply. Two checks, both recorded:
--   • whoever sends an invite confirms everyone on it is 13 or older (invites.age_13_plus_attested);
--   • whoever accepts confirms it for themselves (memberships.age_13_plus_confirmed_at).
-- Under-18s are still minors everywhere else (is_minor: tier M, guardian signer, no likeness lane).

alter table public.invites add column age_13_plus_attested boolean not null default false;
alter table public.memberships add column age_13_plus_confirmed_at timestamptz;

drop function if exists public.accept_invite(text);

-- The old one-argument call now lands here with p_age_13_plus = false and is refused: fail closed.
create or replace function public.accept_invite(p_token text, p_age_13_plus boolean default false)
returns public.member_role
language plpgsql security definer set search_path = public as $$
declare m public.memberships;
begin
  if auth.uid() is null then raise exception 'not_authenticated' using errcode = '28000'; end if;
  if not coalesce(p_age_13_plus, false) then raise exception 'age_13_plus_required' using errcode = 'P0001'; end if;
  m := eduai.accept_invite(p_token, auth.uid());
  update public.memberships set age_13_plus_confirmed_at = coalesce(age_13_plus_confirmed_at, now()) where id = m.id;
  return m.role;
end $$;
revoke all on function public.accept_invite(text, boolean) from public, anon, authenticated;
grant execute on function public.accept_invite(text, boolean) to authenticated;
