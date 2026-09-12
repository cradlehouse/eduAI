-- 0107: the shot console's two RPCs, plus a hardening pass on the role helpers.

-- Role helpers must return true/false, never NULL: a non-member's org_role() is NULL and
-- `NULL in (...)` is NULL, which RLS treats as deny but a plpgsql `if not …` does not.
create or replace function eduai.is_org_member(p_org uuid, p_user uuid default auth.uid())
returns boolean language sql stable security definer set search_path = public as $$
  select eduai.org_role(p_org, p_user) is not null $$;
create or replace function eduai.has_org_role(p_org uuid, p_user uuid, variadic p_roles public.member_role[])
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce(eduai.org_role(p_org, p_user) = any (p_roles), false) $$;
create or replace function eduai.is_org_admin(p_org uuid, p_user uuid default auth.uid())
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce(eduai.org_role(p_org, p_user) in ('admin', 'owner'), false) $$;
create or replace function eduai.is_org_owner(p_org uuid, p_user uuid default auth.uid())
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce(eduai.org_role(p_org, p_user) = 'owner', false) $$;
create or replace function eduai.can_grant_role(p_org uuid, p_role public.member_role, p_user uuid default auth.uid())
returns boolean language sql stable security definer set search_path = public as $$
  select case
    when p_role = 'owner' then false
    when p_role = 'admin' then eduai.is_org_owner(p_org, p_user)
    else eduai.is_org_admin(p_org, p_user)
  end $$;

--   estimate: cost_model × inputs → cents (internal) and → tokens (public). One evaluator for the web
--             estimate and the orchestrator's reservation, so they can never disagree.
--   model_options: every deployment profile with allowed/reason for this org + lane, so the tiles can
--             show exactly why something is locked.

create or replace function eduai.estimate_cents(p_profile uuid, p_inputs jsonb)
returns integer
language plpgsql stable security definer set search_path = public as $$
declare
  cm   jsonb;
  kind text;
  n    numeric;
  txt  text;
begin
  select cost_model into cm from public.deployment_profiles where id = p_profile;
  if cm is null then return null; end if;
  kind := cm ->> 'kind';
  if kind = 'per_second' then
    n := coalesce((p_inputs ->> coalesce(cm ->> 'duration_field', 'duration_s'))::numeric, 0);
    return ceil(n * (cm ->> 'cents_per_second')::numeric)::integer;
  elsif kind = 'per_call' then
    n := coalesce((p_inputs ->> coalesce(cm ->> 'multiplier_field', ''))::numeric, 1);
    return ceil(greatest(n, 1) * (cm ->> 'cents')::numeric)::integer;
  elsif kind = 'per_1k_chars' then
    txt := coalesce(p_inputs ->> coalesce(cm ->> 'text_field', 'text'), '');
    return ceil(greatest(length(txt), 1)::numeric / 1000 * (cm ->> 'cents')::numeric)::integer;
  elsif kind = 'quota' then
    return 0;   -- self-hosted: GPU quota, not money
  end if;
  return null;
end $$;

create or replace function public.estimate_tokens(p_profile uuid, p_inputs jsonb)
returns integer
language sql stable security definer set search_path = public as $$
  select eduai.tokens_ceil(eduai.estimate_cents(p_profile, coalesce(p_inputs, '{}'::jsonb)),
                           (select o.tokens_per_dollar from public.orgs o
                             join public.memberships m on m.org_id = o.id
                             where m.user_id = auth.uid() order by m.created_at limit 1))
$$;
revoke all on function public.estimate_tokens(uuid, jsonb) from public, anon, authenticated;
grant execute on function public.estimate_tokens(uuid, jsonb) to authenticated;

create or replace function public.model_options(p_project uuid, p_lane public.lane)
returns table (
  profile_id uuid, profile_slug text, version_slug text, display_name text, modality public.model_modality,
  lanes public.lane[], kind public.deployment_kind, compute_provider text, input_schema jsonb,
  integrity_rating public.integrity_rating, training_data_disclosure public.genesis_class,
  commercial_eligibility public.commercial_eligibility, license_family text, resource_disclosure public.disclosure_tier,
  release_eligible boolean, limitations text, creative_guidance text,
  allowed boolean, reason text
)
language plpgsql stable security definer set search_path = public as $$
declare v_org uuid;
begin
  select org_id into v_org from public.projects where id = p_project;
  if v_org is null or not eduai.can_access_project(p_project) then return; end if;
  return query
    select dp.id, dp.slug, mv.slug, m.display_name, m.modality, dp.lanes, dp.kind, dp.compute_provider, mv.input_schema,
           mv.integrity_rating, mv.training_data_disclosure, mv.commercial_eligibility, mv.license_family, mv.resource_disclosure,
           mv.release_eligible, mv.limitations, m.creative_guidance,
           a.allowed, a.reason
    from public.deployment_profiles dp
    join public.model_versions mv on mv.id = dp.model_version_id
    join public.models m on m.id = mv.model_id
    cross join lateral eduai.model_allowed(v_org, dp.id, p_lane, auth.uid()) a
    where dp.approval_status <> 'retired'
    order by a.allowed desc, m.display_name;
end $$;
revoke all on function public.model_options(uuid, public.lane) from public, anon, authenticated;
grant execute on function public.model_options(uuid, public.lane) to authenticated;
