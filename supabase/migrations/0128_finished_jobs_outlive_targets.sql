-- 0128: a generate job must aim at a shot or a bible entry while it is live; once it has finished,
-- its receipt and ledger rows are history and must survive the shot (or entry) being deleted.
alter table public.jobs drop constraint jobs_check;
alter table public.jobs add constraint jobs_check check (
  kind <> 'generate' or (deployment_profile_id is not null and model_version_id is not null and lane is not null
                         and (shot_id is not null or bible_entry_id is not null
                              or status in ('succeeded', 'failed', 'rejected', 'cancelled', 'timed_out'))));
