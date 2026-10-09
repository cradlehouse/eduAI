-- The app asks "does the signed-in user manage this project?" (cohort instructor or org admin) when
-- deciding whether a change needs sign-off. eduai.* isn't exposed through the API, so wrap it.
create or replace function public.can_manage_project_for(p_project uuid)
returns boolean language sql stable security invoker set search_path = public as $$
  select coalesce(eduai.can_manage_project(p_project), false)
$$;
revoke all on function public.can_manage_project_for(uuid) from public, anon;
grant execute on function public.can_manage_project_for(uuid) to authenticated;
