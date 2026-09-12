-- 0102: resource neutrality — the fifth integrity axis (energy, water, carbon).
-- Principle: rate what is knowable. Disclosure is rated A/B/C per model version; real numbers exist only
-- where the platform controls the infrastructure (self-hosted profiles), and every receipt carries the
-- estimate that applied at the time with its basis. Never a fabricated kWh for a closed model.

create type public.disclosure_tier as enum ('A', 'B', 'C');
comment on type public.disclosure_tier is
  'A = vendor-published methodology (no video vendor qualifies yet; self-hosted profiles reach it once measured). B = third-party estimated (e.g. HF/CMU text-to-video scaling study). C = no disclosure.';

alter table public.model_versions
  add column resource_disclosure        public.disclosure_tier not null default 'C',
  add column resource_disclosure_source text not null default '';
comment on column public.model_versions.resource_disclosure        is 'Energy/water/carbon disclosure tier. The absence of data is the finding; it is shown as-is on the tile.';
comment on column public.model_versions.resource_disclosure_source is 'What the tier rests on: a vendor URL, a study citation, or "none".';

alter table public.deployment_profiles
  add column compute_provider text not null default '',
  add column energy_profile   jsonb not null default '{}'::jsonb,
  add column resource_model   jsonb not null default '{}'::jsonb;
comment on column public.deployment_profiles.compute_provider is 'Who runs the silicon: fal, replicate, crusoe, aws… (distinct from provider = the API adapter).';
comment on column public.deployment_profiles.energy_profile   is '{"grid": "carbon_neutral_region"|"stranded_energy"|"renewable"|"offset"|"unknown", "region": text, "claim": text, "verifiable": bool, "source": url}';
comment on column public.deployment_profiles.resource_model   is '{"basis": "measured"|"third_party"|"undisclosed", "gpu_watts": N, "wh_per_second_at_5s": N, "length_exponent": 2, "ml_water_per_wh": N, "g_co2e_per_kwh": N, "measured_at": date}. Empty = undisclosed. The length exponent encodes the HF/CMU finding that energy ~quadruples when clip length doubles.';

alter table public.job_receipts
  add column resource_estimate jsonb not null default '{}'::jsonb;
comment on column public.job_receipts.resource_estimate is '{"basis": ..., "wh": N, "g_co2e": N, "ml_water": N, "disclosure_tier": "A"|"B"|"C"} as computed at settle from the profile''s resource_model. {} when undisclosed.';

-- Disclosure tiers and resource models are assessments that improve over time (a measured figure replaces a
-- third-party estimate), so they are operational, not identity: editable on a used version/profile.
-- Receipts freeze what applied at the time, so history is unaffected.
create or replace function eduai.registry_guard() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  mutable text[] := array['approval_status', 'approval_owner', 'approved_at', 'approved_until', 'notes',
                          'updated_at', 'enabled', 'health_status', 'adapter_tested_at', 'quota',
                          'resource_disclosure', 'resource_disclosure_source', 'energy_profile', 'resource_model'];
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

-- settle_job: the receipt now carries resource_estimate (orchestrator computes it from resource_model;
-- when the model is empty the estimate is {} with the disclosure tier, never an invented number).
create or replace function eduai.settle_job(p_job uuid, p_actual_cents integer, p_receipt jsonb default '{}'::jsonb)
returns boolean
language plpgsql security definer set search_path = public as $$
declare
  v_job   public.jobs;
  v_res   public.ledger;
  v_cents integer;
  v_tier  public.disclosure_tier;
begin
  update public.jobs
     set status = 'succeeded', settled_at = now(), completed_at = now(),
         actual_cents = p_actual_cents, cost_unknown = (p_actual_cents is null)
   where id = p_job and settled_at is null
   returning * into v_job;
  if not found then return false; end if;

  select * into v_res from public.ledger where job_id = p_job and kind = 'reserve';
  v_cents := coalesce(p_actual_cents, v_job.estimated_cents, 0);

  insert into public.ledger (org_id, cohort_id, project_id, user_id, job_id, envelope, kind, cents, note)
  values (v_job.org_id, v_job.cohort_id, v_job.project_id, v_job.requested_by, p_job,
          coalesce(v_res.envelope, eduai.job_envelope(p_job)), 'settle',
          v_cents - coalesce(v_res.cents, 0),
          case when p_actual_cents is null then 'cost unknown: settled at estimate' end)
  on conflict (job_id, kind) where job_id is not null and kind in ('reserve', 'settle', 'release') do nothing;

  select resource_disclosure into v_tier from public.model_versions where id = v_job.model_version_id;

  insert into public.job_receipts (job_id, org_id, model_version_id, deployment_profile_id, lane, inputs,
                                   consent_basis, policy_decisions, estimated_cents, actual_cents, cost_unknown,
                                   output_hashes, provenance, resource_estimate)
  values (p_job, v_job.org_id, v_job.model_version_id, v_job.deployment_profile_id, v_job.lane, v_job.inputs,
          coalesce(p_receipt -> 'consent_basis',
                   case when v_job.shot_id is not null then eduai.shot_consent_basis(v_job.shot_id, coalesce(v_job.lane, 'explore')) end,
                   '[]'::jsonb),
          coalesce(p_receipt -> 'policy_decisions', '{}'::jsonb),
          v_job.estimated_cents, p_actual_cents, p_actual_cents is null,
          coalesce((select array_agg(x) from jsonb_array_elements_text(p_receipt -> 'output_hashes') x), '{}'),
          coalesce(p_receipt -> 'provenance', '{}'::jsonb),
          coalesce(p_receipt -> 'resource_estimate', '{}'::jsonb)
            || case when v_tier is not null then jsonb_build_object('disclosure_tier', v_tier) else '{}'::jsonb end)
  on conflict (job_id) do nothing;

  perform eduai.job_event(p_job, 'settled', jsonb_build_object('actual_cents', p_actual_cents, 'estimated_cents', v_job.estimated_cents));
  if p_actual_cents is null then perform eduai.job_event(p_job, 'unknown_cost'); end if;
  return true;
end $$;
