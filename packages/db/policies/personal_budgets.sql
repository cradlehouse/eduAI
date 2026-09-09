create policy personal_budgets_select on public.personal_budgets for select to authenticated
  using (user_id = auth.uid() or eduai.can_manage_cohort(cohort_id));
create policy personal_budgets_write on public.personal_budgets for all to authenticated
  using (eduai.can_manage_cohort(cohort_id)) with check (eduai.can_manage_cohort(cohort_id));
