-- 0010: timelines (OTIO document per version) and submissions (the assessable artefact).

create type public.submission_status as enum ('submitted', 'in_review', 'returned', 'accepted');

create table public.timelines (
  id         uuid primary key default gen_random_uuid(),
  org_id     uuid not null references public.orgs (id) on delete cascade,
  project_id uuid not null,
  version    integer not null check (version > 0),
  otio       jsonb not null default '{}'::jsonb,
  is_current boolean not null default true,
  created_by uuid references public.users (id),
  created_at timestamptz not null default now(),
  foreign key (org_id, project_id) references public.projects (org_id, id) on delete cascade,
  unique (project_id, version),
  unique (org_id, id)
);
comment on column public.timelines.otio is 'OpenTimelineIO JSON. Tracks V1/A1/A2; shots reference takes by id; gaps allowed; no trims in v1.';
create unique index timelines_one_current_idx on public.timelines (project_id) where is_current;

create table public.submissions (
  id               uuid primary key default gen_random_uuid(),
  org_id           uuid not null references public.orgs (id) on delete cascade,
  project_id       uuid not null,
  cohort_module_id uuid not null,
  timeline_id      uuid,
  compare_set      jsonb not null default '{}'::jsonb,
  attempt          integer not null default 1 check (attempt > 0),
  status           public.submission_status not null default 'submitted',
  submitted_by     uuid not null references public.users (id),
  submitted_at     timestamptz not null default now(),
  rubric_draft     jsonb,
  rubric           jsonb,
  feedback         text,
  reviewed_by      uuid references public.users (id),
  reviewed_at      timestamptz,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  foreign key (org_id, project_id)       references public.projects       (org_id, id) on delete cascade,
  foreign key (org_id, cohort_module_id) references public.cohort_modules (org_id, id) on delete cascade,
  foreign key (org_id, timeline_id)      references public.timelines      (org_id, id) on delete set null,
  unique (project_id, cohort_module_id, attempt),
  check (status not in ('returned', 'accepted') or reviewed_by is not null)
);
comment on column public.submissions.compare_set  is '{"take_ids":[...3], "justification": "..."} — the Compare artefact.';
comment on column public.submissions.rubric_draft is 'Assistant #5 draft; instructor edits into rubric.';
create trigger submissions_set_updated_at before update on public.submissions
  for each row execute function eduai.set_updated_at();
