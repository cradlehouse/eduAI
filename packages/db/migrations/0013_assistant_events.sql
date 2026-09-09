-- 0013: one row per Claude call (seven assistants). Cost and evidence trail; never the raw prompt.

create table public.assistant_events (
  id            uuid primary key default gen_random_uuid(),
  org_id        uuid not null references public.orgs (id) on delete cascade,
  user_id       uuid not null references public.users (id),
  project_id    uuid,
  cohort_id     uuid,
  assistant     text not null check (assistant ~ '^[a-z_]{2,40}$'),
  model         text not null,
  input_hash    text not null,
  input         jsonb,
  output        jsonb,
  input_tokens  integer not null default 0,
  output_tokens integer not null default 0,
  cents         integer not null default 0,
  latency_ms    integer,
  created_at    timestamptz not null default now(),
  foreign key (org_id, project_id) references public.projects (org_id, id) on delete set null,
  foreign key (org_id, cohort_id)  references public.cohorts  (org_id, id) on delete set null
);
comment on column public.assistant_events.input is 'Redacted structured input (ids + parameters). Free-text prompt content is hashed into input_hash, not stored.';
create index assistant_events_user_idx   on public.assistant_events (user_id, created_at desc);
create index assistant_events_cohort_idx on public.assistant_events (cohort_id, created_at desc) where cohort_id is not null;
