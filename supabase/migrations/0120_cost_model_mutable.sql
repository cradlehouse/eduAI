-- 0120: a price correction must not force a new route.
-- The first pricing check against fal (2026-09-22) found three of four Phase 1 cost models wrong
-- (Veo Lite 15¢ → 5¢, LTX fast 4¢ → 9¢, Stable Audio 5¢ → 20¢). Vendors reprice; the weekly watch
-- exists to catch it. Every job snapshots estimated_cents/actual_cents at claim time, so the receipt
-- survives a later correction. Let cost_model change on a used profile; identity fields stay frozen.
create or replace function eduai.registry_guard() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  mutable text[] := array['approval_status', 'approval_owner', 'approved_at', 'approved_until', 'notes',
                          'updated_at', 'enabled', 'health_status', 'adapter_tested_at', 'quota',
                          'resource_disclosure', 'resource_disclosure_source', 'energy_profile', 'resource_model',
                          'adapter', 'compute_provider', 'cost_model'];
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
