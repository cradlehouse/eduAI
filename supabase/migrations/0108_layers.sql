-- 0108: layers. A cut is built from picture layers (background plate, character pass, merged take)
-- and audio layers (dialogue, sfx); music is scored to the locked cut at the timeline stage.
-- A background plate belongs to the location and is reused across cuts at no extra cost.

create type public.layer as enum ('background', 'character', 'merged', 'dialogue', 'sfx', 'music');
comment on type public.layer is 'background = location plate (reusable across the scene); character = consent-bearing pass; merged = the take students compare; dialogue/sfx per cut; music per scene at timeline stage.';

alter table public.jobs  add column layer public.layer not null default 'merged';
alter table public.takes add column layer public.layer not null default 'merged';
create index takes_layer_idx on public.takes (shot_id, layer) where lifecycle = 'live';

-- A cut may reuse a background plate generated for another cut of the same project.
alter table public.shots
  add column plate_take_id uuid,
  add constraint shots_plate_take_fk foreign key (org_id, plate_take_id) references public.takes (org_id, id) on delete set null;
comment on column public.shots.plate_take_id is 'Background plate reused for this cut (a live take with layer = background from any cut in the project).';
comment on column public.shots.intent is 'Shot intent, required before Generate (eduai.shot_ready): {"objective", "continuity", "camera_language", "dialogue" (the line, optional), "no_bible_assets"}. Bible assets live in shot_bible_entries.';

-- Receipts record the layer too.
alter table public.job_receipts add column layer public.layer;
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

  insert into public.job_receipts (job_id, org_id, model_version_id, deployment_profile_id, lane, layer, inputs,
                                   consent_basis, policy_decisions, estimated_cents, actual_cents, cost_unknown,
                                   output_hashes, provenance, resource_estimate)
  values (p_job, v_job.org_id, v_job.model_version_id, v_job.deployment_profile_id, v_job.lane, v_job.layer, v_job.inputs,
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

-- job_tokens exposes the layer so the shell can show per-layer spend (drop/create: a view cannot gain a middle column in place).
drop view public.job_tokens;
create view public.job_tokens as
select j.id as job_id, j.org_id, j.project_id, j.shot_id, j.lane, j.layer, j.status, j.cost_unknown, j.created_at,
       case when j.estimated_cents is null then null else eduai.tokens_ceil(j.estimated_cents, o.tokens_per_dollar) end as estimated_tokens,
       case when j.actual_cents    is null then null else eduai.tokens_ceil(j.actual_cents,    o.tokens_per_dollar) end as actual_tokens
from public.jobs j
join public.orgs o on o.id = j.org_id
where eduai.can_access_project(j.project_id);
grant select on public.job_tokens to authenticated;
revoke select on public.job_tokens from anon;
grant select (layer) on public.jobs to authenticated;

-- Consent lane for audio: dialogue in a real person's voice is the voice_likeness lane.
-- The gate is the same shot_ready(shot, lane); the console passes 'voice_likeness' for dialogue jobs
-- whose bible entries are voice entries.
