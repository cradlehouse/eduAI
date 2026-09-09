-- 0003: courses → modules (curriculum), cohorts → cohort_modules (schedule + gates), cohort_instructors.
-- Child tables carry org_id AND a composite FK (org_id, parent_id) so org_id can never
-- disagree with the parent's. Policies trust org_id because of this.

create type public.gate_kind as enum ('none', 'submission', 'instructor');
comment on type public.gate_kind is
  'none = opens at cohort_modules.opens_at. submission = opens once the submission for gate_module_id is accepted. instructor = opens when cohort_modules.gate_unlocked_at is set.';

create table public.courses (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null references public.orgs (id) on delete cascade,
  slug        text not null check (slug ~ '^[a-z0-9][a-z0-9-]{1,59}$'),
  title       text not null,
  description text not null default '',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (org_id, slug),
  unique (org_id, id)
);
create trigger courses_set_updated_at before update on public.courses
  for each row execute function eduai.set_updated_at();

create table public.modules (
  id             uuid primary key default gen_random_uuid(),
  org_id         uuid not null references public.orgs (id) on delete cascade,
  course_id      uuid not null,
  position       integer not null check (position > 0),
  title          text not null,
  brief          text not null default '',
  gate_kind      public.gate_kind not null default 'none',
  gate_module_id uuid references public.modules (id) on delete set null,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  foreign key (org_id, course_id) references public.courses (org_id, id) on delete cascade,
  unique (course_id, position) deferrable initially deferred,
  unique (org_id, id),
  check (gate_kind <> 'submission' or gate_module_id is not null)
);
comment on column public.modules.brief is 'Markdown. The week''s brief shown on /p/[projectId]/module.';
create trigger modules_set_updated_at before update on public.modules
  for each row execute function eduai.set_updated_at();

create table public.cohorts (
  id         uuid primary key default gen_random_uuid(),
  org_id     uuid not null references public.orgs (id) on delete cascade,
  course_id  uuid not null,
  name       text not null,
  starts_on  date,
  ends_on    date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (org_id, course_id) references public.courses (org_id, id),
  unique (org_id, name),
  unique (org_id, id),
  check (starts_on is null or ends_on is null or ends_on >= starts_on)
);
create trigger cohorts_set_updated_at before update on public.cohorts
  for each row execute function eduai.set_updated_at();

create table public.cohort_modules (
  id               uuid primary key default gen_random_uuid(),
  org_id           uuid not null references public.orgs (id) on delete cascade,
  cohort_id        uuid not null,
  module_id        uuid not null,
  opens_at         timestamptz,
  due_at           timestamptz,
  enabled          boolean not null default true,
  gate_unlocked_at timestamptz,
  gate_unlocked_by uuid references public.users (id),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  foreign key (org_id, cohort_id) references public.cohorts (org_id, id) on delete cascade,
  foreign key (org_id, module_id) references public.modules (org_id, id) on delete cascade,
  unique (cohort_id, module_id),
  unique (org_id, id)
);
create trigger cohort_modules_set_updated_at before update on public.cohort_modules
  for each row execute function eduai.set_updated_at();

create table public.cohort_instructors (
  id         uuid primary key default gen_random_uuid(),
  org_id     uuid not null references public.orgs (id) on delete cascade,
  cohort_id  uuid not null,
  user_id    uuid not null references public.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  foreign key (org_id, cohort_id) references public.cohorts (org_id, id) on delete cascade,
  unique (cohort_id, user_id)
);
create index cohort_instructors_user_idx on public.cohort_instructors (user_id);

-- helpers ------------------------------------------------------------------

create or replace function eduai.cohort_org(p_cohort uuid) returns uuid
language sql stable security definer set search_path = public as $$
  select org_id from public.cohorts where id = p_cohort
$$;

create or replace function eduai.is_cohort_instructor(p_cohort uuid, p_user uuid default auth.uid())
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.cohort_instructors where cohort_id = p_cohort and user_id = p_user)
$$;

-- instructor assigned to the cohort, or org admin/owner
create or replace function eduai.can_manage_cohort(p_cohort uuid, p_user uuid default auth.uid())
returns boolean
language sql stable security definer set search_path = public as $$
  select eduai.is_cohort_instructor(p_cohort, p_user) or eduai.is_org_admin(eduai.cohort_org(p_cohort), p_user)
$$;
