-- Fixture for scripts/orchestrator-test.sh: the smoke test's demo people, a ready shot with consent, no Vault.
\set ON_ERROR_STOP on
insert into auth.users (id, email) values
  ('10000000-0000-4000-8000-000000000001', 'demo-instructor@example.com'),
  ('10000000-0000-4000-8000-000000000002', 'demo-student-1@example.com');
select eduai.accept_invite('demo-instructor-token', '10000000-0000-4000-8000-000000000001');
select eduai.accept_invite('demo-student-1-token',  '10000000-0000-4000-8000-000000000002');
insert into public.scenes (id, org_id, project_id, position, title) values
  ('30000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000030', 1, 'Night shift');
insert into public.shots (id, org_id, project_id, scene_id, position, label, intent) values
  ('40000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000030', '30000000-0000-4000-8000-000000000001', 1, '1A',
   '{"objective":"establish dread","continuity":"match 1B lighting","camera_language":"slow push-in"}');
insert into public.bible_entries (id, org_id, project_id, kind, name, likeness_of, requires_consent, created_by) values
  ('50000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000030', 'character', 'Guard Ana', 'Ana Example', true, '10000000-0000-4000-8000-000000000002');
insert into public.shot_bible_entries (org_id, shot_id, bible_entry_id) values
  ('00000000-0000-4000-8000-000000000001', '40000000-0000-4000-8000-000000000001', '50000000-0000-4000-8000-000000000001');
insert into public.consent_releases (org_id, project_id, bible_entry_id, subject_name, rights_holder_name, permitted_lanes, distribution, state, signed_at, created_by)
values ('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000030', '50000000-0000-4000-8000-000000000001',
        'Ana Example', 'Ana Example', '{explore,control}', 'cohort', 'signed', now(), '10000000-0000-4000-8000-000000000002');
create schema if not exists vault;
create table if not exists vault.decrypted_secrets (id uuid primary key, decrypted_secret text);
