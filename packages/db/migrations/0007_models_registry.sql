-- 0007: the registry. Four entities, not one flag:
--   models (family) → model_versions (exact release, weights, license, approval window)
--   → deployment_profiles (where it runs, cost, retention, safety, lanes, health)
--   → org_model_profiles (time-bounded allowlist per org with owner + review date).
-- A model is selectable only through an approved profile that an org has allowlisted for a lane.
-- Registry records used by any job are immutable (eduai.registry_guard); changes = a new version/profile.

create type public.model_modality         as enum ('text_to_video', 'image_to_video', 'text_to_image', 'image_edit',
                                                   'text_to_speech', 'sound_effects', 'music', 'upscale');
create type public.weights_status         as enum ('closed', 'open_weight', 'open_source');
create type public.commercial_eligibility as enum ('allowed', 'threshold', 'non_commercial', 'unknown');
create type public.integrity_rating       as enum ('high', 'medium', 'low', 'unrated');
create type public.genesis_class          as enum ('licensed', 'opt_out', 'undisclosed', 'synthetic');
create type public.risk_level             as enum ('none', 'low', 'high');
create type public.approval_status        as enum ('draft', 'approved', 'suspended', 'retired');
create type public.deployment_kind        as enum ('managed_api', 'self_hosted');
create type public.credential_policy      as enum ('platform', 'org', 'either');
create type public.health_status          as enum ('untested', 'healthy', 'degraded', 'down');

comment on type public.commercial_eligibility is 'allowed | threshold (commercial use above a revenue/size threshold needs a licence, e.g. LTX) | non_commercial (e.g. FLUX dev) | unknown';
comment on type public.genesis_class          is 'Training-data disclosure: licensed | opt_out (respects opt-outs) | undisclosed | synthetic.';
comment on type public.approval_status        is 'draft = in registry, not selectable. approved = selectable within approved_until. suspended/retired = not selectable, history kept.';

create table public.models (
  id                uuid primary key default gen_random_uuid(),
  slug              text not null unique check (slug ~ '^[a-z0-9][a-z0-9.-]{1,59}$'),
  display_name      text not null,
  modality          public.model_modality not null,
  creative_guidance text not null default '',
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
comment on table public.models is 'Model FAMILY: identity, capability class, creative guidance. Global, no org_id. Readable by all authenticated users.';
create trigger models_set_updated_at before update on public.models
  for each row execute function eduai.set_updated_at();

create table public.model_versions (
  id                       uuid primary key default gen_random_uuid(),
  model_id                 uuid not null references public.models (id),
  slug                     text not null unique check (slug ~ '^[a-z0-9][a-z0-9.-]{1,79}$'),
  version                  text not null,
  weights_status           public.weights_status not null,
  license_family           text not null,
  license_version          text not null default '',
  license_url              text not null default '',
  commercial_eligibility   public.commercial_eligibility not null default 'unknown',
  training_data_disclosure public.genesis_class not null default 'undisclosed',
  output_rights_summary    text not null default '',
  self_hostable            boolean not null default false,
  voice_likeness_risk      public.risk_level not null default 'none',
  release_eligible         boolean not null default false,
  integrity_rating         public.integrity_rating not null default 'unrated',
  indemnification          boolean not null default false,
  min_content_tier         public.content_tier not null default 'M',
  limitations              text not null default '',
  input_schema             jsonb not null default '{"type":"object"}'::jsonb,
  safety                   jsonb not null default '{}'::jsonb,
  safety_pipeline_version  text not null default '',
  approval_status          public.approval_status not null default 'draft',
  approval_owner           text,
  approved_at              date,
  approved_until           date,
  notes                    text not null default '',
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now(),
  unique (model_id, version),
  check (input_schema ? 'type'),
  check (approval_status <> 'approved' or (approval_owner is not null and approved_at is not null and approved_until is not null))
);
comment on table  public.model_versions                  is 'Exact release + rights record. Each FLUX/LTX/etc. version is its own row with its own licence.';
comment on column public.model_versions.input_schema     is 'JSON Schema 2020-12 with x-ui hints; SchemaForm renders it. string/enum/number/integer/boolean and {"format":"asset-ref"}.';
comment on column public.model_versions.safety           is '{"output_moderation": bool, "prompt_gate": "required"|"optional"}';
comment on column public.model_versions.release_eligible is 'May outputs be published (Release gate)? False for non-commercial licences.';
create trigger model_versions_set_updated_at before update on public.model_versions
  for each row execute function eduai.set_updated_at();

create table public.deployment_profiles (
  id                      uuid primary key default gen_random_uuid(),
  model_version_id        uuid not null references public.model_versions (id),
  slug                    text not null unique check (slug ~ '^[a-z0-9][a-z0-9.-]{1,59}@[a-z0-9][a-z0-9.-]{1,19}$'),   -- <version>@<route>
  kind                    public.deployment_kind not null,
  provider                text not null check (provider in ('fal', 'replicate', 'runway', 'elevenlabs', 'selfhosted')),
  endpoint                text not null,
  region                  text not null default 'unknown',
  credential_policy       public.credential_policy not null default 'platform',
  lanes                   public.lane[] not null,
  cost_model              jsonb not null,
  retention               jsonb not null default '{}'::jsonb,
  safety_pipeline_version text not null default '',
  image_version           text,
  model_checksum          text,
  quota                   jsonb not null default '{}'::jsonb,
  health_status           public.health_status not null default 'untested',
  adapter_tested_at       timestamptz,
  approval_status         public.approval_status not null default 'draft',
  approval_owner          text,
  approved_at             date,
  approved_until          date,
  enabled                 boolean not null default true,
  notes                   text not null default '',
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now(),
  check (cardinality(lanes) > 0),
  check (cost_model ? 'kind'),
  check ((kind = 'self_hosted') = (provider = 'selfhosted')),
  check (kind <> 'self_hosted' or (image_version is not null and model_checksum is not null)),
  check (approval_status <> 'approved' or (approval_owner is not null and approved_at is not null and approved_until is not null and adapter_tested_at is not null))
);
comment on table  public.deployment_profiles            is 'A route for a version: managed API or self-hosted cluster. Approval requires a tested adapter (adapter_tested_at).';
comment on column public.deployment_profiles.cost_model is '{"kind":"per_second","cents_per_second":N,"duration_field":..} | {"kind":"per_call","cents":N,"multiplier_field":?} | {"kind":"per_1k_chars","cents":N,"text_field":..} | {"kind":"quota","unit":"gpu_seconds"}';
comment on column public.deployment_profiles.retention  is '{"vendor_retains_inputs": bool, "vendor_retention_days": N|null, "platform_input_days": N, "platform_output_days": N}';
comment on column public.deployment_profiles.quota      is 'Self-hosted only: {"gpu_seconds_per_day": N, "max_concurrent": N}. Self-hosted is a separate deployment class in the orchestrator, not just another adapter.';
create trigger deployment_profiles_set_updated_at before update on public.deployment_profiles
  for each row execute function eduai.set_updated_at();

create table public.org_model_profiles (
  id                       uuid primary key default gen_random_uuid(),
  org_id                   uuid not null references public.orgs (id) on delete cascade,
  deployment_profile_id    uuid not null references public.deployment_profiles (id),
  lanes                    public.lane[] not null,
  starts_on                date not null default current_date,
  ends_on                  date not null,
  budget_cap_cents         integer check (budget_cap_cents >= 0),
  release_allowed          boolean not null default false,
  requires_instructor_gate boolean not null default false,
  approved_by              uuid references public.users (id),
  review_by                date not null,
  notes                    text not null default '',
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now(),
  unique (org_id, deployment_profile_id),
  check (cardinality(lanes) > 0),
  check (ends_on >= starts_on),
  check (review_by <= ends_on)
);
comment on table public.org_model_profiles is 'Time-bounded allowlist. Every approval has an owner and a review date; nothing is allowed forever.';
create trigger org_model_profiles_set_updated_at before update on public.org_model_profiles
  for each row execute function eduai.set_updated_at();

alter table public.takes
  add column model_version_id uuid references public.model_versions (id),
  add column deployment_profile_id uuid references public.deployment_profiles (id);
alter table public.takes drop column model_id;

-- Immutability: once any job references a version or profile, only operational columns may change.
-- Anything else (schema, licence, endpoint, cost…) is a new row.
create or replace function eduai.registry_guard() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  mutable text[] := array['approval_status', 'approval_owner', 'approved_at', 'approved_until', 'notes',
                          'updated_at', 'enabled', 'health_status', 'adapter_tested_at', 'quota'];
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
-- (triggers attached in 0008, after jobs exists)

-- Gate, DB side. The orchestrator's gates.py calls this first, then the prompt gate.
create or replace function eduai.model_allowed(p_org uuid, p_profile uuid, p_lane public.lane, p_user uuid default auth.uid())
returns table (allowed boolean, reason text)
language plpgsql stable security definer set search_path = public as $$
declare
  dp public.deployment_profiles;
  mv public.model_versions;
  al public.org_model_profiles;
begin
  select * into dp from public.deployment_profiles where id = p_profile;
  if not found then return query select false, 'unknown_profile'; return; end if;
  if dp.approval_status <> 'approved' or not dp.enabled then return query select false, 'profile_not_approved'; return; end if;
  if dp.approved_until < current_date then return query select false, 'profile_approval_expired'; return; end if;
  if dp.health_status = 'down' then return query select false, 'profile_down'; return; end if;
  if not (p_lane = any (dp.lanes)) then return query select false, 'lane_not_supported'; return; end if;

  select * into mv from public.model_versions where id = dp.model_version_id;
  if mv.approval_status <> 'approved' then return query select false, 'version_not_approved'; return; end if;
  if mv.approved_until < current_date then return query select false, 'version_approval_expired'; return; end if;

  select * into al from public.org_model_profiles where org_id = p_org and deployment_profile_id = p_profile;
  if not found then return query select false, 'not_in_org_allowlist'; return; end if;
  if current_date < al.starts_on then return query select false, 'allowlist_not_started'; return; end if;
  if current_date > al.ends_on then return query select false, 'allowlist_expired'; return; end if;
  if not (p_lane = any (al.lanes)) then return query select false, 'lane_not_allowed_for_org'; return; end if;

  if mv.min_content_tier = 'A' and eduai.effective_content_tier(p_org, p_user) = 'M' then
    return query select false, 'content_tier'; return;
  end if;
  if (p_lane = 'voice_likeness' or mv.voice_likeness_risk = 'high') and eduai.is_minor_in(p_org, p_user) then
    return query select false, 'minor_voice_likeness'; return;
  end if;

  return query select true, null::text;
end $$;
