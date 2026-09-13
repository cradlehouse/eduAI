-- 0117: the invite page shows the org's wordmark. Return type changes ⇒ drop and recreate.
drop function public.invite_preview(text);
create or replace function public.invite_preview(p_token text)
returns table (status text, org_name text, role public.member_role, email_masked text, cohort_name text, project_title text, org_logo text)
language plpgsql stable security definer set search_path = public as $$
declare i public.invites;
begin
  select * into i from public.invites where token = p_token;
  if not found then
    return query select 'not_found'::text, null::text, null::public.member_role, null::text, null::text, null::text, null::text;
    return;
  end if;
  return query
    select case when i.accepted_at is not null then 'accepted'
                when i.expires_at < now()   then 'expired'
                else 'open' end,
           o.name, i.role,
           regexp_replace(i.email, '^(.).*(@.*)$', '\1•••\2'),
           c.name, p.title, o.logo_url
    from public.orgs o
    left join public.cohorts  c on c.id = i.cohort_id
    left join public.projects p on p.id = i.project_id
    where o.id = i.org_id;
end $$;
revoke all on function public.invite_preview(text) from public, anon, authenticated;
grant execute on function public.invite_preview(text) to anon, authenticated;
