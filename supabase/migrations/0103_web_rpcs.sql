-- 0103: the RPCs the web app calls through PostgREST. Thin public wrappers that run as the
-- signed-in user; the logic stays in eduai.*. Because acceptance uses auth.uid(), the web tier
-- needs no service-role key for P1-03.

-- Unauthenticated preview of an invite (the token is the secret). Never returns the full email.
create or replace function public.invite_preview(p_token text)
returns table (status text, org_name text, role public.member_role, email_masked text, cohort_name text, project_title text)
language plpgsql stable security definer set search_path = public as $$
declare i public.invites;
begin
  select * into i from public.invites where token = p_token;
  if not found then
    return query select 'not_found'::text, null::text, null::public.member_role, null::text, null::text, null::text;
    return;
  end if;
  return query
    select case when i.accepted_at is not null then 'accepted'
                when i.expires_at < now()   then 'expired'
                else 'open' end,
           o.name, i.role,
           regexp_replace(i.email, '^(.).*(@.*)$', '\1•••\2'),
           c.name, p.title
    from public.orgs o
    left join public.cohorts  c on c.id = i.cohort_id
    left join public.projects p on p.id = i.project_id
    where o.id = i.org_id;
end $$;
-- Supabase default privileges grant new public functions to anon/authenticated; revoke explicitly.
revoke all on function public.invite_preview(text) from public, anon, authenticated;
grant execute on function public.invite_preview(text) to anon, authenticated;

-- Accept as the signed-in user. Email must match the invite (checked inside eduai.accept_invite).
create or replace function public.accept_invite(p_token text)
returns public.member_role
language plpgsql security definer set search_path = public as $$
declare m public.memberships;
begin
  if auth.uid() is null then raise exception 'not_authenticated' using errcode = '28000'; end if;
  m := eduai.accept_invite(p_token, auth.uid());
  return m.role;
end $$;
revoke all on function public.accept_invite(text) from public, anon, authenticated;
grant execute on function public.accept_invite(text) to authenticated;

-- Where a signed-in user lands. admin/owner → /org; instructor → their first cohort;
-- student → their first project; member with nothing assigned yet → /welcome.
create or replace function public.my_landing()
returns text
language sql stable security definer set search_path = public as $$
  select case
    when exists (select 1 from public.memberships where user_id = auth.uid() and role in ('admin', 'owner')) then '/org'
    when exists (select 1 from public.cohort_instructors where user_id = auth.uid())
      then '/c/' || (select cohort_id::text from public.cohort_instructors where user_id = auth.uid() order by created_at limit 1)
    when exists (select 1 from public.project_members where user_id = auth.uid())
      then '/p/' || (select project_id::text from public.project_members where user_id = auth.uid() order by created_at limit 1)
    else '/welcome'
  end
$$;
revoke all on function public.my_landing() from public, anon, authenticated;
grant execute on function public.my_landing() to authenticated;
