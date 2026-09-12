-- Functional smoke test. Runs inside one transaction and rolls back, so the seeded DB is untouched.
-- Proves: invite acceptance, composite-FK isolation, registry gate + immutability, shot readiness + consent,
-- org-fair claim, event log, reserve/settle/release idempotency + receipts, append-only tables, RLS.
\set ON_ERROR_STOP on
begin;

insert into auth.users (id, email) values
  ('10000000-0000-4000-8000-000000000001', 'demo-instructor@example.com'),
  ('10000000-0000-4000-8000-000000000002', 'demo-student-1@example.com'),
  ('10000000-0000-4000-8000-000000000003', 'demo-student-2@example.com'),
  ('10000000-0000-4000-8000-000000000004', 'outsider@example.com');

select (eduai.accept_invite('demo-instructor-token', '10000000-0000-4000-8000-000000000001')).role;
select (eduai.accept_invite('demo-student-1-token',  '10000000-0000-4000-8000-000000000002')).role;
select (eduai.accept_invite('demo-student-2-token',  '10000000-0000-4000-8000-000000000003')).role;

do $$
begin
  assert (select count(*) from public.memberships where org_id = '00000000-0000-4000-8000-000000000001') = 3, 'three memberships';
  assert exists (select 1 from public.cohort_instructors where user_id = '10000000-0000-4000-8000-000000000001'), 'instructor assigned';
  assert (select role from public.project_members where user_id = '10000000-0000-4000-8000-000000000002') = 'director', 'student-1 director';
  begin
    perform eduai.accept_invite('demo-student-1-token', '10000000-0000-4000-8000-000000000002');
    raise exception 'second accept should fail';
  exception when others then assert sqlerrm = 'invite_already_accepted', sqlerrm;
  end;
  raise notice 'ok  invites';
end $$;

-- second org for fairness + isolation
insert into public.orgs (id, slug, name) values ('00000000-0000-4000-8000-000000000002', 'other', 'Other School');
insert into public.courses (id, org_id, slug, title) values ('00000000-0000-4000-8000-000000000011', '00000000-0000-4000-8000-000000000002', 'course-1', 'Course');
insert into public.cohorts (id, org_id, course_id, name) values ('00000000-0000-4000-8000-000000000021', '00000000-0000-4000-8000-000000000002', '00000000-0000-4000-8000-000000000011', 'C1');
insert into public.projects (id, org_id, cohort_id, slug, title) values ('00000000-0000-4000-8000-000000000031', '00000000-0000-4000-8000-000000000002', '00000000-0000-4000-8000-000000000021', 'project-1', 'Project');
insert into public.project_budgets (org_id, project_id, total_cents) values ('00000000-0000-4000-8000-000000000002', '00000000-0000-4000-8000-000000000031', 5000);
insert into public.memberships (org_id, user_id, role) values ('00000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000004', 'student');
insert into public.project_members (org_id, project_id, user_id) values ('00000000-0000-4000-8000-000000000002', '00000000-0000-4000-8000-000000000031', '10000000-0000-4000-8000-000000000004');
insert into public.org_model_profiles (org_id, deployment_profile_id, lanes, ends_on, review_by)
select '00000000-0000-4000-8000-000000000002', id, '{explore}', '2026-12-31', '2026-12-01' from public.deployment_profiles where slug = 'ltx-2.5@fal';

do $$
begin
  begin
    insert into public.projects (org_id, cohort_id, slug, title) values ('00000000-0000-4000-8000-000000000002', '00000000-0000-4000-8000-000000000020', 'spoof', 'spoof');
    raise exception 'cross-org insert should fail';
  exception when foreign_key_violation then null;
  end;
  raise notice 'ok  composite org FKs';
end $$;

-- registry gate
do $$
declare r record; demo uuid := '00000000-0000-4000-8000-000000000001'; stu uuid := '10000000-0000-4000-8000-000000000002';
  ltx uuid := (select id from public.deployment_profiles where slug = 'ltx-2.5@fal');
  veo uuid := (select id from public.deployment_profiles where slug = 'veo-3.1-lite@fal');
  flux uuid := (select id from public.deployment_profiles where slug = 'flux-2-dev@fal');
begin
  assert (select count(*) from public.deployment_profiles where approval_status = 'approved') = 3, 'three approved Phase 1 profiles';
  assert (select count(*) from public.deployment_profiles where kind = 'self_hosted' and compute_provider = 'crusoe' and approval_status = 'draft') = 1, 'crusoe draft profile';
  assert (select resource_disclosure from public.model_versions where slug = 'kling-3') = 'C', 'closed vendor = C';
  assert (select count(*) from public.model_versions where resource_disclosure = 'A') = 0, 'nobody is tier A yet';
  select * into r from eduai.model_allowed(demo, ltx, 'explore', stu);  assert r.allowed, 'ltx explore allowed';
  select * into r from eduai.model_allowed(demo, ltx, 'control', stu);  assert r.allowed, 'ltx control allowed';
  select * into r from eduai.model_allowed(demo, ltx, 'finish', stu);   assert r.reason = 'lane_not_supported', 'ltx has no finish lane: ' || r.reason;
  select * into r from eduai.model_allowed(demo, veo, 'finish', stu);   assert r.allowed, 'veo finish allowed';
  select * into r from eduai.model_allowed(demo, flux, 'explore', stu); assert r.reason = 'profile_not_approved', 'draft profile blocked: ' || r.reason;
  select * into r from eduai.model_allowed('00000000-0000-4000-8000-000000000002', veo, 'finish', '10000000-0000-4000-8000-000000000004');
  assert r.reason = 'not_in_org_allowlist', 'other org lacks veo: ' || r.reason;
  select * into r from eduai.model_allowed('00000000-0000-4000-8000-000000000002', ltx, 'control', '10000000-0000-4000-8000-000000000004');
  assert r.reason = 'lane_not_allowed_for_org', 'other org allowlisted explore only: ' || r.reason;
  update public.org_model_profiles set starts_on = '2026-08-01', ends_on = '2026-09-01', review_by = '2026-08-15' where org_id = '00000000-0000-4000-8000-000000000002';
  select * into r from eduai.model_allowed('00000000-0000-4000-8000-000000000002', ltx, 'explore', '10000000-0000-4000-8000-000000000004');
  assert r.reason = 'allowlist_expired', 'time-bounded allowlist: ' || r.reason;
  update public.org_model_profiles set starts_on = '2026-09-09', ends_on = '2026-12-31', review_by = '2026-12-01' where org_id = '00000000-0000-4000-8000-000000000002';
  raise notice 'ok  model_allowed';
end $$;

-- shot intent + consent (lane-aware)
insert into public.scenes (id, org_id, project_id, position, title) values
  ('30000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000030', 1, 'Night shift');
insert into public.shots (id, org_id, project_id, scene_id, position, label) values
  ('40000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000030', '30000000-0000-4000-8000-000000000001', 1, '1A');
insert into public.bible_entries (id, org_id, project_id, kind, name, likeness_of, requires_consent, created_by) values
  ('50000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000030', 'character', 'Guard Ana', 'Ana Example', true, '10000000-0000-4000-8000-000000000002');
insert into public.shot_bible_entries (org_id, shot_id, bible_entry_id) values
  ('00000000-0000-4000-8000-000000000001', '40000000-0000-4000-8000-000000000001', '50000000-0000-4000-8000-000000000001');
do $$
declare r record;
begin
  select * into r from eduai.shot_ready('40000000-0000-4000-8000-000000000001', 'explore');
  assert not r.ready and r.missing @> '{objective,continuity,camera_language,consent}', 'empty intent blocks: ' || array_to_string(r.missing, ',');
  update public.shots set intent = '{"objective":"establish dread","continuity":"match 1B lighting","camera_language":"slow push-in"}'
   where id = '40000000-0000-4000-8000-000000000001';
  select * into r from eduai.shot_ready('40000000-0000-4000-8000-000000000001', 'explore');
  assert not r.ready and r.missing = '{consent}', 'only consent missing: ' || array_to_string(r.missing, ',');
  assert eduai.bible_consent_state('50000000-0000-4000-8000-000000000001', 'explore') = 'missing', 'no release yet';

  insert into public.consent_releases (org_id, project_id, bible_entry_id, subject_name, rights_holder_name, permitted_lanes, distribution, state, signed_at, created_by)
  values ('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000030', '50000000-0000-4000-8000-000000000001',
          'Ana Example', 'Ana Example', '{explore,control}', 'cohort', 'signed', now(), '10000000-0000-4000-8000-000000000002');
  assert eduai.bible_consent_state('50000000-0000-4000-8000-000000000001', 'explore') = 'signed', 'explore permitted';
  assert eduai.bible_consent_state('50000000-0000-4000-8000-000000000001', 'finish') = 'lane_not_permitted', 'finish not permitted';
  assert eduai.shot_consent_ok('40000000-0000-4000-8000-000000000001', 'explore'), 'shot ok in explore';
  assert not eduai.shot_consent_ok('40000000-0000-4000-8000-000000000001', 'finish'), 'shot blocked in finish';
  select * into r from eduai.shot_ready('40000000-0000-4000-8000-000000000001', 'explore');
  assert r.ready, 'shot ready';
  assert jsonb_array_length(eduai.shot_consent_basis('40000000-0000-4000-8000-000000000001', 'explore')) = 1, 'consent basis lists the entry';
  raise notice 'ok  shot intent + consent';
end $$;

-- queue: three demo jobs then one "other" job; claims must alternate demo, other, demo, demo
insert into public.jobs (id, project_id, shot_id, deployment_profile_id, lane, requested_by, inputs)
select j.id, '00000000-0000-4000-8000-000000000030', '40000000-0000-4000-8000-000000000001', dp.id, 'explore', '10000000-0000-4000-8000-000000000002', j.inputs
from (values ('20000000-0000-4000-8000-000000000001'::uuid, '{"prompt":"a"}'::jsonb),
             ('20000000-0000-4000-8000-000000000002', '{"prompt":"b"}'),
             ('20000000-0000-4000-8000-000000000003', '{"prompt":"c"}')) j(id, inputs)
cross join (select id from public.deployment_profiles where slug = 'ltx-2.5@fal') dp;
update public.jobs set created_at = created_at - interval '1 minute'  where id = '20000000-0000-4000-8000-000000000001';
update public.jobs set created_at = created_at - interval '30 seconds' where id = '20000000-0000-4000-8000-000000000002';
insert into public.scenes (id, org_id, project_id, position, title) values ('30000000-0000-4000-8000-000000000002', '00000000-0000-4000-8000-000000000002', '00000000-0000-4000-8000-000000000031', 1, 'S');
insert into public.shots (id, org_id, project_id, scene_id, position) values ('40000000-0000-4000-8000-000000000002', '00000000-0000-4000-8000-000000000002', '00000000-0000-4000-8000-000000000031', '30000000-0000-4000-8000-000000000002', 1);
insert into public.jobs (id, project_id, shot_id, deployment_profile_id, lane, requested_by, inputs)
values ('20000000-0000-4000-8000-000000000004', '00000000-0000-4000-8000-000000000031', '40000000-0000-4000-8000-000000000002',
        (select id from public.deployment_profiles where slug = 'ltx-2.5@fal'), 'explore', '10000000-0000-4000-8000-000000000004', '{"prompt":"d"}');

do $$
declare j public.jobs; got uuid[] := '{}';
begin
  assert (select org_id from public.jobs where id = '20000000-0000-4000-8000-000000000001') = '00000000-0000-4000-8000-000000000001', 'trigger filled org_id';
  assert (select provider from public.jobs where id = '20000000-0000-4000-8000-000000000001') = 'fal', 'trigger filled provider';
  assert (select model_version_id from public.jobs where id = '20000000-0000-4000-8000-000000000001') = (select id from public.model_versions where slug = 'ltx-2.5'), 'trigger pinned model version';
  assert (select count(*) from public.job_events where event = 'queued') = 4, 'queued events logged';
  for i in 1..5 loop
    j := eduai.claim_job('{generate}', 'w' || i);
    got := got || j.id;
  end loop;
  assert got[1] = '20000000-0000-4000-8000-000000000001', 'claim 1 = demo oldest';
  assert got[2] = '20000000-0000-4000-8000-000000000004', 'claim 2 = other org (0 in flight)';
  assert got[3] = '20000000-0000-4000-8000-000000000002', 'claim 3 = demo next';
  assert got[4] = '20000000-0000-4000-8000-000000000003', 'claim 4 = demo last';
  assert got[5] is null, 'claim 5 = empty queue';
  assert (select count(*) from public.job_events where event = 'claimed') = 4, 'claimed events logged';
  raise notice 'ok  org-fair claim + events';
end $$;

-- registry immutability once used
do $$
begin
  update public.model_versions set approved_until = '2027-06-30' where slug = 'ltx-2.5';                     -- operational: fine
  begin
    update public.model_versions set input_schema = '{"type":"object","properties":{}}' where slug = 'ltx-2.5';
    raise exception 'schema change on a used version should fail';
  exception when others then assert sqlerrm like 'registry_record_in_use:%', sqlerrm;
  end;
  begin
    update public.deployment_profiles set endpoint = 'fal-ai/other' where slug = 'ltx-2.5@fal';
    raise exception 'endpoint change on a used profile should fail';
  exception when others then assert sqlerrm like 'registry_record_in_use:%', sqlerrm;
  end;
  update public.deployment_profiles set endpoint = 'fal-ai/other' where slug = 'kling-3@fal';                 -- unused: fine
  -- resource assessments are operational: a measured figure may replace an estimate on a used profile
  update public.deployment_profiles set resource_model = '{"basis":"measured","gpu_watts":300}' where slug = 'ltx-2.5@fal';
  update public.model_versions set resource_disclosure = 'A' where slug = 'ltx-2.5';
  assert (select resource_disclosure from public.model_versions where slug = 'ltx-2.5') = 'A', 'disclosure tier updatable on used version';
  update public.model_versions set resource_disclosure = 'B' where slug = 'ltx-2.5';
  raise notice 'ok  registry immutability';
end $$;

-- ledger + receipts
do $$
declare v_remaining int; rc public.job_receipts;
begin
  assert eduai.reserve_job('20000000-0000-4000-8000-000000000001', 1000), 'reserve 1000';
  assert eduai.reserve_job('20000000-0000-4000-8000-000000000001', 1000), 'reserve is idempotent';
  select remaining_cents into v_remaining from public.project_budget_status where project_id = '00000000-0000-4000-8000-000000000030';
  assert v_remaining = 59000, 'remaining after reserve = 59000, got ' || v_remaining;

  perform eduai.mark_submitted('20000000-0000-4000-8000-000000000001', 'fal-req-1');
  perform eduai.mark_running('20000000-0000-4000-8000-000000000001');
  perform eduai.job_event('20000000-0000-4000-8000-000000000001', 'output_received', '{"n":1}');
  perform eduai.job_event('20000000-0000-4000-8000-000000000001', 'stored');
  perform eduai.job_event('20000000-0000-4000-8000-000000000001', 'policy_approved', '{"gate":"pg-1"}');
  assert eduai.settle_job('20000000-0000-4000-8000-000000000001', 1200,
           '{"output_hashes":["abc"],"policy_decisions":{"prompt_gate":"pass"},"provenance":{"c2pa":"m1"},"resource_estimate":{"basis":"undisclosed"}}'), 'settle 1200';
  assert not eduai.settle_job('20000000-0000-4000-8000-000000000001', 1200), 'replayed settle is a no-op';
  assert not eduai.settle_job('20000000-0000-4000-8000-000000000001', 9999), 'replayed settle with other amount is a no-op';
  select remaining_cents into v_remaining from public.project_budget_status where project_id = '00000000-0000-4000-8000-000000000030';
  assert v_remaining = 58800, 'remaining after settle = 58800, got ' || v_remaining;
  assert (select count(*) from public.ledger where job_id = '20000000-0000-4000-8000-000000000001') = 2, 'exactly reserve + settle rows';
  assert not eduai.release_job('20000000-0000-4000-8000-000000000001'), 'cannot release a settled job';

  select * into rc from public.job_receipts where job_id = '20000000-0000-4000-8000-000000000001';
  assert rc.model_version_id = (select id from public.model_versions where slug = 'ltx-2.5'), 'receipt pins version';
  assert rc.lane = 'explore' and rc.output_hashes = '{abc}' and rc.provenance ->> 'c2pa' = 'm1', 'receipt carries hashes + provenance';
  assert jsonb_array_length(rc.consent_basis) = 1 and rc.consent_basis -> 0 ->> 'state' = 'signed', 'receipt froze consent basis';
  assert rc.resource_estimate ->> 'disclosure_tier' = 'B' and rc.resource_estimate ->> 'basis' = 'undisclosed',
         'receipt carries the disclosure tier and no invented number: ' || rc.resource_estimate::text;
  assert (select array_agg(event order by at, id) from public.job_events where job_id = '20000000-0000-4000-8000-000000000001')
         = '{queued,claimed,submitted,running,output_received,stored,policy_approved,settled}'::public.job_event[], 'full lifecycle logged';

  -- reserve then fail → released; second release no-op
  assert eduai.reserve_job('20000000-0000-4000-8000-000000000002', 700), 'reserve job 2';
  assert eduai.release_job('20000000-0000-4000-8000-000000000002', 'timed_out', 'no webhook in 20m'), 'release job 2';
  assert not eduai.release_job('20000000-0000-4000-8000-000000000002', 'failed'), 'release is idempotent';
  select remaining_cents into v_remaining from public.project_budget_status where project_id = '00000000-0000-4000-8000-000000000030';
  assert v_remaining = 58800, 'release gave the money back, got ' || v_remaining;
  assert (select status from public.jobs where id = '20000000-0000-4000-8000-000000000002') = 'timed_out', 'job 2 timed out';

  -- unknown cost: settled at estimate, flagged
  assert eduai.reserve_job('20000000-0000-4000-8000-000000000003', 500), 'reserve job 3';
  assert eduai.settle_job('20000000-0000-4000-8000-000000000003', null), 'settle with unknown cost';
  assert (select cost_unknown from public.jobs where id = '20000000-0000-4000-8000-000000000003'), 'cost_unknown flagged';
  select remaining_cents into v_remaining from public.project_budget_status where project_id = '00000000-0000-4000-8000-000000000030';
  assert v_remaining = 58300, 'unknown cost charged at estimate, got ' || v_remaining;
  assert exists (select 1 from public.job_events where job_id = '20000000-0000-4000-8000-000000000003' and event = 'unknown_cost'), 'unknown_cost event';

  -- append-only
  begin
    update public.ledger set cents = 0 where job_id = '20000000-0000-4000-8000-000000000001';
    raise exception 'ledger update should fail';
  exception when others then assert sqlerrm like 'append_only:%', sqlerrm;
  end;
  begin
    delete from public.job_receipts where job_id = '20000000-0000-4000-8000-000000000001';
    raise exception 'receipt delete should fail';
  exception when others then assert sqlerrm like 'append_only:%', sqlerrm;
  end;
  insert into public.ledger (org_id, cohort_id, project_id, user_id, job_id, envelope, kind, cents, note)
  values ('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000020', '00000000-0000-4000-8000-000000000030',
          '10000000-0000-4000-8000-000000000002', '20000000-0000-4000-8000-000000000001', 'project', 'refund', -200, 'vendor credited failed frames');
  select remaining_cents into v_remaining from public.project_budget_status where project_id = '00000000-0000-4000-8000-000000000030';
  assert v_remaining = 58500, 'refund is a new row, got ' || v_remaining;

  -- webhook inbox dedupe + drain
  insert into public.webhook_inbox (provider, dedupe_key, body, signature_ok) values ('fal', 'evt-1', '{}', true);
  insert into public.webhook_inbox (provider, dedupe_key, body, signature_ok) values ('fal', 'evt-1', '{}', true) on conflict do nothing;
  assert (select count(*) from public.webhook_inbox) = 1, 'replayed webhook deduped';
  assert (select count(*) from eduai.claim_inbox(10)) = 1, 'drain claims one';
  raise notice 'ok  ledger + receipts + inbox';
end $$;

-- RLS: outsider (member of "other" only)
set local role authenticated;
set local request.jwt.claims to '{"sub":"10000000-0000-4000-8000-000000000004"}';
do $$
begin
  assert (select count(*) from public.projects) = 1, 'outsider sees only own project';
  assert (select count(*) from public.jobs where org_id = '00000000-0000-4000-8000-000000000001') = 0, 'outsider sees no demo jobs';
  assert (select count(*) from public.job_receipts) = 0, 'outsider sees no demo receipts';
  assert (select count(*) from public.job_events where org_id = '00000000-0000-4000-8000-000000000001') = 0, 'outsider sees no demo events';
  assert (select count(*) from public.ledger) = 0, 'outsider sees no demo ledger';
  assert (select count(*) from public.deployment_profiles) = 7, 'registry readable';
  assert (select count(*) from public.org_model_profiles) = 1, 'sees own org allowlist only';
  assert (select count(*) from public.consent_releases) = 0, 'sees no demo releases';
  begin
    insert into public.jobs (project_id, shot_id, deployment_profile_id, lane, requested_by, inputs)
    values ('00000000-0000-4000-8000-000000000030', '40000000-0000-4000-8000-000000000001', (select id from public.deployment_profiles where slug = 'ltx-2.5@fal'), 'explore', '10000000-0000-4000-8000-000000000004', '{}');
    raise exception 'outsider job insert should be blocked';
  exception when insufficient_privilege then null;
  end;
  raise notice 'ok  rls outsider';
end $$;

-- RLS: student-1 in demo
set local request.jwt.claims to '{"sub":"10000000-0000-4000-8000-000000000002"}';
do $$
declare v_id uuid;
begin
  assert (select count(*) from public.projects) = 1, 'student sees own project';
  assert (select remaining_cents from public.project_budget_status) = 58500, 'student sees project budget';
  assert (select count(*) from public.job_receipts) = 2, 'student sees project receipts';
  assert (select count(*) from public.invites) = 0, 'student cannot see invites';
  assert (select count(*) from public.org_credentials) = 0, 'student cannot see credentials';
  insert into public.jobs (project_id, shot_id, deployment_profile_id, lane, inputs)
  values ('00000000-0000-4000-8000-000000000030', '40000000-0000-4000-8000-000000000001', (select id from public.deployment_profiles where slug = 'veo-3.1-lite@fal'), 'finish', '{"prompt":"x"}')
  returning id into v_id;
  assert (select org_id from public.jobs where id = v_id) = '00000000-0000-4000-8000-000000000001', 'student job got org from trigger';
  update public.jobs set status = 'cancelled' where id = v_id;
  assert (select status from public.jobs where id = v_id) = 'cancelled', 'student cancelled own queued job';
  update public.jobs set status = 'succeeded' where id = v_id;   -- matches no row under USING
  assert (select status from public.jobs where id = v_id) = 'cancelled', 'student cannot force succeeded';
  begin
    insert into public.project_members (org_id, project_id, user_id)
    values ('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000030', '10000000-0000-4000-8000-000000000004');
    raise exception 'student adding members should be blocked';
  exception when insufficient_privilege then null;
  end;
  begin
    update public.consent_releases set state = 'revoked', revoked_at = now() where bible_entry_id = '50000000-0000-4000-8000-000000000001';
    -- zero rows match USING (can_manage_project) — state must be unchanged
  end;
  assert (select state from public.consent_releases where bible_entry_id = '50000000-0000-4000-8000-000000000001') = 'signed', 'student cannot revoke';
  raise notice 'ok  rls student';
end $$;

-- RLS: instructor sees the cohort's project without being a member, and can review
set local request.jwt.claims to '{"sub":"10000000-0000-4000-8000-000000000001"}';
do $$
begin
  assert (select count(*) from public.projects) = 1, 'instructor sees cohort project';
  assert (select count(*) from public.jobs) >= 4, 'instructor sees cohort jobs';
  assert (select count(*) from public.ledger) = 7, 'instructor sees cohort ledger (2+2+2+refund)';
  insert into public.project_budgets (org_id, project_id, total_cents)
  values ('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000030', 1)
  on conflict (project_id) do update set total_cents = 70000;
  assert (select total_cents from public.project_budgets) = 70000, 'instructor adjusted budget';
  update public.consent_releases set state = 'revoked', revoked_at = now(), revoked_reason = 'subject withdrew' where bible_entry_id = '50000000-0000-4000-8000-000000000001';
  assert (select state from public.consent_releases where bible_entry_id = '50000000-0000-4000-8000-000000000001') = 'revoked', 'instructor revoked';
  raise notice 'ok  rls instructor';
end $$;

reset role;
do $$
begin
  assert not eduai.shot_consent_ok('40000000-0000-4000-8000-000000000001', 'explore'), 'revocation blocks new generation';
  assert (select consent_basis -> 0 ->> 'state' from public.job_receipts where job_id = '20000000-0000-4000-8000-000000000001') = 'signed',
         'historic receipt still shows the basis that applied at the time';
  raise notice 'ok  revocation semantics';
end $$;
rollback;
