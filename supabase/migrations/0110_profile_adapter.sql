-- 0110: deployment_profiles.adapter — how the orchestrator maps our input schema onto the vendor's
-- request and where the vendor puts its files. Registry-driven so a vendor route is a row, not code.
--   {"input_map": {"duration_s": {"to": "duration", "suffix": "s"}, "image": "image_url", "camera_motion": null},
--    "fixed": {"generate_audio": false},
--    "outputs": ["video"]}            -- keys of the vendor response that hold {url, content_type,...}; omitted ⇒ walk the response
-- Operational: fixing a field name must not require a new profile slug, so the guard lets it change.
alter table public.deployment_profiles add column adapter jsonb not null default '{}'::jsonb;
comment on column public.deployment_profiles.adapter is 'Orchestrator request/response mapping. input_map: our field → vendor field (string), {to, suffix|prefix} or null to drop; fixed: vendor fields always sent; outputs: response keys holding files.';

create or replace function eduai.registry_guard() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  mutable text[] := array['approval_status', 'approval_owner', 'approved_at', 'approved_until', 'notes',
                          'updated_at', 'enabled', 'health_status', 'adapter_tested_at', 'quota',
                          'resource_disclosure', 'resource_disclosure_source', 'energy_profile', 'resource_model',
                          'adapter'];
  in_use boolean;
begin
  if tg_table_name = 'model_versions' then
    in_use := exists (select 1 from public.jobs where model_version_id = old.id);
  else
    in_use := exists (select 1 from public.jobs where deployment_profile_id = old.id);
  end if;
  if in_use and (to_jsonb(old) - mutable) <> (to_jsonb(new) - mutable) then
    raise exception 'registry_record_in_use: % % is referenced by jobs; create a new record instead', tg_table_name, old.slug
      using errcode = 'P0001';
  end if;
  return new;
end $$;
