create policy assistant_events_select on public.assistant_events for select to authenticated
  using (user_id = auth.uid() or (cohort_id is not null and eduai.can_manage_cohort(cohort_id)));
-- written by the orchestrator's /assist/* under service role
