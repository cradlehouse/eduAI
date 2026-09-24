-- 0122: job_tokens runs as the invoker (0113); the entry-target columns added in 0121 need the same
-- column grant the other exposed job columns have, or the whole view is denied.
grant select (bible_entry_id, entry_role) on public.jobs to authenticated;
