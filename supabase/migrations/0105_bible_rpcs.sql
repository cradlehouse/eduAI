-- 0105: lane-aware consent state for the Bible UI. Thin public wrapper over eduai.bible_consent_state
-- with the project access check; the internal schema stays unexposed.
create or replace function public.bible_consent_state_for(p_entry uuid, p_lane public.lane)
returns text
language sql stable security definer set search_path = public as $$
  select case
    when eduai.can_access_project((select project_id from public.bible_entries where id = p_entry))
      then eduai.bible_consent_state(p_entry, p_lane)
    else null
  end
$$;
revoke all on function public.bible_consent_state_for(uuid, public.lane) from public, anon, authenticated;
grant execute on function public.bible_consent_state_for(uuid, public.lane) to authenticated;
