-- Demo org. Fixed UUIDs so it is idempotent and the smoke test can reference rows.
-- Runs after models.sql (see supabase/config.toml [db.seed].sql_paths).
-- No auth users are seeded: sign in by magic link and accept one of the invite tokens below.

insert into public.orgs (id, slug, name, content_tier, has_minors)
values ('00000000-0000-4000-8000-000000000001', 'demo', 'Demo Film School', 'M', false)
on conflict (id) do nothing;

insert into public.courses (id, org_id, slug, title, description)
values ('00000000-0000-4000-8000-000000000010', '00000000-0000-4000-8000-000000000001',
        'ai-filmmaking-foundations', 'AI Filmmaking Foundations',
        'Six weeks: bible → shots → drafts → compare → timeline → release.')
on conflict (id) do nothing;

insert into public.modules (id, org_id, course_id, position, title, brief, gate_kind, gate_module_id) values
  ('00000000-0000-4000-8000-000000000101', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000010', 1, 'Bible & consent',      'Build the project bible. Every real person gets a signed release before they appear.', 'none', null),
  ('00000000-0000-4000-8000-000000000102', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000010', 2, 'Scenes & shots',       'Break the script into scenes and shots. A shot is one generation target.', 'none', null),
  ('00000000-0000-4000-8000-000000000103', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000010', 3, 'Draft generation',     'Draft-tier models only. Spend the budget on coverage, not polish.', 'none', null),
  ('00000000-0000-4000-8000-000000000104', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000010', 4, 'Compare & justify',    'Three takes per shot, side by side. Write the justification: why this one.', 'submission', '00000000-0000-4000-8000-000000000103'),
  ('00000000-0000-4000-8000-000000000105', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000010', 5, 'Timeline & export',    'Assemble the picture. Export with the disclosure sheet.', 'none', null),
  ('00000000-0000-4000-8000-000000000106', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000010', 6, 'Release',              'Instructor-gated. Six checks, then publish.', 'instructor', null)
on conflict (id) do nothing;

insert into public.cohorts (id, org_id, course_id, name, starts_on, ends_on)
values ('00000000-0000-4000-8000-000000000020', '00000000-0000-4000-8000-000000000001',
        '00000000-0000-4000-8000-000000000010', 'Autumn 2026', '2026-09-28', '2026-11-08')
on conflict (id) do nothing;

insert into public.cohort_modules (org_id, cohort_id, module_id, opens_at, due_at)
select m.org_id, '00000000-0000-4000-8000-000000000020', m.id,
       timestamptz '2026-09-28 09:00+00' + (m.position - 1) * interval '7 days',
       timestamptz '2026-10-04 23:59+00' + (m.position - 1) * interval '7 days'
from public.modules m
where m.course_id = '00000000-0000-4000-8000-000000000010'
on conflict (cohort_id, module_id) do nothing;

insert into public.projects (id, org_id, cohort_id, slug, title, logline)
values ('00000000-0000-4000-8000-000000000030', '00000000-0000-4000-8000-000000000001',
        '00000000-0000-4000-8000-000000000020', 'warehouse', 'SC/Warehouse',
        'Two night guards, one warehouse, one thing that should not be moving.')
on conflict (id) do nothing;

insert into public.project_budgets (org_id, project_id, total_cents)
values ('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000030', 60000)
on conflict (project_id) do nothing;

-- Allowlist the three APPROVED Phase 1 profiles for the demo org, time-bounded, with a review date.
-- Draft profiles (kling, flux, chatterbox) are in the registry but deliberately not allowlisted.
-- starts_on = approval date, not cohort start: instructors need to test routes before week 1.
insert into public.org_model_profiles (org_id, deployment_profile_id, lanes, starts_on, ends_on, review_by, release_allowed, requires_instructor_gate, notes)
select '00000000-0000-4000-8000-000000000001', dp.id, dp.lanes, '2026-09-09', '2026-12-31', '2026-11-15',
       ('finish' = any (dp.lanes)), ('finish' = any (dp.lanes)), 'Autumn 2026 cohort'
from public.deployment_profiles dp
where dp.slug in ('veo-3.1-lite@fal', 'ltx-2.5@fal', 'stable-audio-3@fal')
on conflict (org_id, deployment_profile_id) do nothing;

-- Invite tokens (demo only — real tokens are random). Accept via eduai.accept_invite(token, user_id).
insert into public.invites (org_id, email, role, cohort_id, project_id, project_role, token, expires_at) values
  ('00000000-0000-4000-8000-000000000001', 'demo-instructor@example.com', 'instructor',
   '00000000-0000-4000-8000-000000000020', null, null, 'demo-instructor-token', '2027-12-31'),
  ('00000000-0000-4000-8000-000000000001', 'demo-student-1@example.com', 'student',
   '00000000-0000-4000-8000-000000000020', '00000000-0000-4000-8000-000000000030', 'director', 'demo-student-1-token', '2027-12-31'),
  ('00000000-0000-4000-8000-000000000001', 'demo-student-2@example.com', 'student',
   '00000000-0000-4000-8000-000000000020', '00000000-0000-4000-8000-000000000030', 'dp', 'demo-student-2-token', '2027-12-31')
on conflict (token) do nothing;
