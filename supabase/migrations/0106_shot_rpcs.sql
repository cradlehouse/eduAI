-- 0106: shot readiness for the UI. Public wrapper over eduai.shot_ready with the access check.
create or replace function public.shot_ready_for(p_shot uuid, p_lane public.lane)
returns table (ready boolean, missing text[])
language sql stable security definer set search_path = public as $$
  select r.ready, r.missing
  from eduai.shot_ready(p_shot, p_lane) r
  where eduai.can_access_project((select project_id from public.shots where id = p_shot))
$$;
revoke all on function public.shot_ready_for(uuid, public.lane) from public, anon, authenticated;
grant execute on function public.shot_ready_for(uuid, public.lane) to authenticated;
