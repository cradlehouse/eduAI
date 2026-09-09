-- 0004: enrolments, projects, project_members, invites, and eduai.accept_invite().

create type public.enrolment_status as enum ('active', 'withdrawn', 'completed');
create type public.project_role     as enum ('director', 'dp', 'sound', 'editor', 'producer');
comment on type public.project_role is 'Labels for the credits page and the ledger, not permissions. No permission matrix in v1.';

create table public.enrolments (
  id         uuid primary key default gen_random_uuid(),
  org_id     uuid not null references public.orgs (id) on delete cascade,
  cohort_id  uuid not null,
  user_id    uuid not null references public.users (id) on delete cascade,
  status     public.enrolment_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (org_id, cohort_id) references public.cohorts (org_id, id) on delete cascade,
  unique (cohort_id, user_id)
);
create index enrolments_user_idx on public.enrolments (user_id);
create trigger enrolments_set_updated_at before update on public.enrolments
  for each row execute function eduai.set_updated_at();

create table public.projects (
  id         uuid primary key default gen_random_uuid(),
  org_id     uuid not null references public.orgs (id) on delete cascade,
  cohort_id  uuid not null,
  slug       text not null check (slug ~ '^[a-z0-9][a-z0-9-]{1,59}$'),
  title      text not null,
  logline    text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (org_id, cohort_id) references public.cohorts (org_id, id) on delete cascade,
  unique (cohort_id, slug),
  unique (org_id, id)
);
create trigger projects_set_updated_at before update on public.projects
  for each row execute function eduai.set_updated_at();

create table public.project_members (
  id         uuid primary key default gen_random_uuid(),
  org_id     uuid not null references public.orgs (id) on delete cascade,
  project_id uuid not null,
  user_id    uuid not null references public.users (id) on delete cascade,
  role       public.project_role not null default 'director',
  created_at timestamptz not null default now(),
  foreign key (org_id, project_id) references public.projects (org_id, id) on delete cascade,
  unique (project_id, user_id)
);
create index project_members_user_idx on public.project_members (user_id);

create table public.invites (
  id               uuid primary key default gen_random_uuid(),
  org_id           uuid not null references public.orgs (id) on delete cascade,
  email            text not null check (email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  role             public.member_role not null default 'student' check (role <> 'owner'),
  is_minor         boolean not null default false,
  cohort_id        uuid,
  project_id       uuid,
  project_role     public.project_role,
  token            text not null unique default encode(gen_random_bytes(24), 'hex'),
  invited_by       uuid references public.users (id),
  expires_at       timestamptz not null default now() + interval '14 days',
  accepted_at      timestamptz,
  accepted_user_id uuid references public.users (id),
  created_at       timestamptz not null default now(),
  foreign key (org_id, cohort_id)  references public.cohorts  (org_id, id) on delete cascade,
  foreign key (org_id, project_id) references public.projects (org_id, id) on delete cascade,
  check (project_id is null or cohort_id is not null)
);
create index invites_email_idx on public.invites (lower(email));

-- helpers ------------------------------------------------------------------

create or replace function eduai.project_org(p_project uuid) returns uuid
language sql stable security definer set search_path = public as $$
  select org_id from public.projects where id = p_project
$$;

create or replace function eduai.project_cohort(p_project uuid) returns uuid
language sql stable security definer set search_path = public as $$
  select cohort_id from public.projects where id = p_project
$$;

create or replace function eduai.is_project_member(p_project uuid, p_user uuid default auth.uid())
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.project_members where project_id = p_project and user_id = p_user)
$$;

create or replace function eduai.is_enrolled(p_cohort uuid, p_user uuid default auth.uid())
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.enrolments where cohort_id = p_cohort and user_id = p_user and status = 'active')
$$;

-- enrolled student, assigned instructor, or org admin/owner
create or replace function eduai.can_view_cohort(p_cohort uuid, p_user uuid default auth.uid())
returns boolean
language sql stable security definer set search_path = public as $$
  select eduai.is_enrolled(p_cohort, p_user) or eduai.can_manage_cohort(p_cohort, p_user)
$$;

-- instructor of the project's cohort, or org admin/owner (privileged writes: members, budgets, review, release)
create or replace function eduai.can_manage_project(p_project uuid, p_user uuid default auth.uid())
returns boolean
language sql stable security definer set search_path = public as $$
  select eduai.can_manage_cohort(eduai.project_cohort(p_project), p_user)
$$;

-- project member, or anyone who can manage it (everything a student can do, instructors can too)
create or replace function eduai.can_access_project(p_project uuid, p_user uuid default auth.uid())
returns boolean
language sql stable security definer set search_path = public as $$
  select eduai.is_project_member(p_project, p_user) or eduai.can_manage_project(p_project, p_user)
$$;

-- Accept an invite: membership + enrolment (or instructor assignment) + project membership,
-- one transaction. Called from /invite/[token] under the service role after magic-link sign-in.
create or replace function eduai.accept_invite(p_token text, p_user uuid)
returns public.memberships
language plpgsql security definer set search_path = public as $$
declare
  v_inv   public.invites;
  v_m     public.memberships;
  v_email text;
begin
  select * into v_inv from public.invites where token = p_token for update;
  if not found then raise exception 'invite_not_found' using errcode = 'P0002'; end if;
  if v_inv.accepted_at is not null then raise exception 'invite_already_accepted' using errcode = 'P0001'; end if;
  if v_inv.expires_at < now() then raise exception 'invite_expired' using errcode = 'P0001'; end if;

  select email into v_email from public.users where id = p_user;
  if v_email is null then raise exception 'user_not_found' using errcode = 'P0002'; end if;
  if lower(v_email) <> lower(v_inv.email) then raise exception 'invite_email_mismatch' using errcode = 'P0001'; end if;

  insert into public.memberships (org_id, user_id, role, is_minor)
  values (v_inv.org_id, p_user, v_inv.role, v_inv.is_minor)
  on conflict (org_id, user_id) do update
    set role     = greatest(public.memberships.role, excluded.role),   -- never downgrade
        is_minor = public.memberships.is_minor or excluded.is_minor
  returning * into v_m;

  if v_inv.cohort_id is not null then
    if v_inv.role = 'instructor' then
      insert into public.cohort_instructors (org_id, cohort_id, user_id)
      values (v_inv.org_id, v_inv.cohort_id, p_user)
      on conflict (cohort_id, user_id) do nothing;
    else
      insert into public.enrolments (org_id, cohort_id, user_id)
      values (v_inv.org_id, v_inv.cohort_id, p_user)
      on conflict (cohort_id, user_id) do nothing;
    end if;
  end if;

  if v_inv.project_id is not null then
    insert into public.project_members (org_id, project_id, user_id, role)
    values (v_inv.org_id, v_inv.project_id, p_user, coalesce(v_inv.project_role, 'director'))
    on conflict (project_id, user_id) do nothing;
  end if;

  update public.invites set accepted_at = now(), accepted_user_id = p_user where id = v_inv.id;
  return v_m;
end $$;
