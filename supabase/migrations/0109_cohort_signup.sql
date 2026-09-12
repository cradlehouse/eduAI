-- 0109: the cohort is the student's home.
--   • roles are a list per member, drawn from an org-editable role list
--   • projects are posted with a state, crew cap, roles needed, optional approval
--   • students sign up (signup_requests) and pick one or more roles
--   • students see their cohort's people and projects; instructors see the roster

-- org-editable role list -----------------------------------------------------------
alter table public.orgs add column project_roles text[] not null
  default '{director,dp,sound,editor,producer,writer,storyboard artist,colourist,composer}';
comment on column public.orgs.project_roles is 'The roles a school uses on crews. Admin-editable. Credits labels, not permissions.';

-- multi-role membership ---------------------------------------------------------------
alter table public.project_members add column roles text[] not null default '{}';
update public.project_members set roles = array[role::text];
alter table public.project_members drop column role;
alter table public.project_members add constraint project_members_roles_nonempty check (cardinality(roles) > 0);

-- posting ---------------------------------------------------------------------------------
create type public.project_status as enum ('draft', 'open', 'crewed', 'closed');
alter table public.projects
  add column status public.project_status not null default 'open',
  add column crew_cap integer check (crew_cap is null or crew_cap > 0),
  add column roles_needed text[] not null default '{}',
  add column requires_approval boolean not null default false;
comment on column public.projects.status is 'draft = instructor only; open = posted, sign-ups accepted; crewed = full; closed = archived.';

-- sign-up requests ------------------------------------------------------------------------
create type public.signup_status as enum ('pending', 'approved', 'declined');
create table public.signup_requests (
  id         uuid primary key default gen_random_uuid(),
  org_id     uuid not null references public.orgs (id) on delete cascade,
  project_id uuid not null,
  user_id    uuid not null references public.users (id) on delete cascade,
  roles      text[] not null check (cardinality(roles) > 0),
  status     public.signup_status not null default 'pending',
  decided_by uuid references public.users (id),
  decided_at timestamptz,
  created_at timestamptz not null default now(),
  foreign key (org_id, project_id) references public.projects (org_id, id) on delete cascade
);
create unique index signup_requests_open_idx on public.signup_requests (project_id, user_id) where status = 'pending';
alter table public.signup_requests enable row level security;
create policy signup_requests_select on public.signup_requests for select to authenticated
  using (user_id = auth.uid() or eduai.can_manage_project(project_id));
create policy signup_requests_update on public.signup_requests for update to authenticated
  using (eduai.can_manage_project(project_id)) with check (eduai.can_manage_project(project_id));
-- inserts go through public.sign_up (validation)

-- visibility inside the cohort ----------------------------------------------------------
-- Students see their cohort's projects (to sign up), members (teammates) and enrolments (the team).
drop policy projects_select on public.projects;
create policy projects_select on public.projects for select to authenticated
  using ((eduai.can_view_cohort(cohort_id) or eduai.is_project_member(id)) and (status <> 'draft' or eduai.can_manage_cohort(cohort_id)));
drop policy project_members_select on public.project_members;
create policy project_members_select on public.project_members for select to authenticated
  using (eduai.can_view_cohort(eduai.project_cohort(project_id)) or eduai.is_project_member(project_id));
drop policy enrolments_select on public.enrolments;
create policy enrolments_select on public.enrolments for select to authenticated
  using (eduai.can_view_cohort(cohort_id));
-- members may edit their own roles on a project they are on
create policy project_members_update_own on public.project_members for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- accept_invite: project_role → roles ----------------------------------------------------
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
    set role = greatest(public.memberships.role, excluded.role), is_minor = public.memberships.is_minor or excluded.is_minor
  returning * into v_m;

  if v_inv.cohort_id is not null then
    if v_inv.role = 'instructor' then
      insert into public.cohort_instructors (org_id, cohort_id, user_id) values (v_inv.org_id, v_inv.cohort_id, p_user) on conflict (cohort_id, user_id) do nothing;
    else
      insert into public.enrolments (org_id, cohort_id, user_id) values (v_inv.org_id, v_inv.cohort_id, p_user) on conflict (cohort_id, user_id) do nothing;
    end if;
  end if;
  if v_inv.project_id is not null then
    insert into public.project_members (org_id, project_id, user_id, roles)
    values (v_inv.org_id, v_inv.project_id, p_user, array[coalesce(v_inv.project_role::text, 'director')])
    on conflict (project_id, user_id) do nothing;
  end if;
  update public.invites set accepted_at = now(), accepted_user_id = p_user where id = v_inv.id;
  return v_m;
end $$;

-- sign-up ------------------------------------------------------------------------------------
-- Returns 'joined' (auto) or 'pending' (approval required). Validates enrolment, state, roles, cap.
create or replace function public.sign_up(p_project uuid, p_roles text[])
returns text
language plpgsql security definer set search_path = public as $$
declare
  v_project public.projects;
  v_roles   text[];
  v_count   integer;
begin
  if auth.uid() is null then raise exception 'not_authenticated' using errcode = '28000'; end if;
  select * into v_project from public.projects where id = p_project for update;
  if not found then raise exception 'project_not_found' using errcode = 'P0002'; end if;
  if not eduai.is_enrolled(v_project.cohort_id) then raise exception 'not_enrolled' using errcode = '42501'; end if;
  if v_project.status <> 'open' then raise exception 'project_not_open' using errcode = 'P0001'; end if;
  if exists (select 1 from public.project_members where project_id = p_project and user_id = auth.uid()) then raise exception 'already_on_project' using errcode = 'P0001'; end if;
  select project_roles into v_roles from public.orgs where id = v_project.org_id;
  if cardinality(p_roles) = 0 or not (p_roles <@ v_roles) then raise exception 'invalid_roles' using errcode = 'P0001'; end if;
  select count(*) into v_count from public.project_members where project_id = p_project;
  if v_project.crew_cap is not null and v_count >= v_project.crew_cap then raise exception 'project_full' using errcode = 'P0001'; end if;

  if v_project.requires_approval then
    insert into public.signup_requests (org_id, project_id, user_id, roles) values (v_project.org_id, p_project, auth.uid(), p_roles)
    on conflict (project_id, user_id) where status = 'pending' do update set roles = excluded.roles;
    return 'pending';
  end if;
  insert into public.project_members (org_id, project_id, user_id, roles) values (v_project.org_id, p_project, auth.uid(), p_roles);
  if v_project.crew_cap is not null and v_count + 1 >= v_project.crew_cap then
    update public.projects set status = 'crewed' where id = p_project;
  end if;
  return 'joined';
end $$;
revoke all on function public.sign_up(uuid, text[]) from public, anon, authenticated;
grant execute on function public.sign_up(uuid, text[]) to authenticated;

create or replace function public.decide_signup(p_request uuid, p_approve boolean)
returns text
language plpgsql security definer set search_path = public as $$
declare v_req public.signup_requests; v_project public.projects; v_count integer;
begin
  select * into v_req from public.signup_requests where id = p_request for update;
  if not found then raise exception 'request_not_found' using errcode = 'P0002'; end if;
  if not eduai.can_manage_project(v_req.project_id) then raise exception 'not_allowed' using errcode = '42501'; end if;
  if v_req.status <> 'pending' then return v_req.status::text; end if;
  update public.signup_requests set status = case when p_approve then 'approved' else 'declined' end::public.signup_status,
         decided_by = auth.uid(), decided_at = now() where id = p_request;
  if p_approve then
    select * into v_project from public.projects where id = v_req.project_id;
    insert into public.project_members (org_id, project_id, user_id, roles) values (v_req.org_id, v_req.project_id, v_req.user_id, v_req.roles)
    on conflict (project_id, user_id) do update set roles = excluded.roles;
    select count(*) into v_count from public.project_members where project_id = v_req.project_id;
    if v_project.crew_cap is not null and v_count >= v_project.crew_cap then update public.projects set status = 'crewed' where id = v_req.project_id; end if;
    return 'approved';
  end if;
  return 'declined';
end $$;
revoke all on function public.decide_signup(uuid, boolean) from public, anon, authenticated;
grant execute on function public.decide_signup(uuid, boolean) to authenticated;

-- landing: the cohort is home ----------------------------------------------------------------
create or replace function public.my_landing()
returns text
language plpgsql stable security definer set search_path = public as $$
declare v_n integer; v_cohort uuid;
begin
  if auth.uid() is null then return '/login'; end if;
  -- instructors/admins: their cohort if exactly one, else the hub
  select count(distinct c.id), min(c.id::text)::uuid into v_n, v_cohort
  from public.cohorts c
  where eduai.is_cohort_instructor(c.id) or eduai.is_org_admin(c.org_id);
  if v_n = 1 then return '/c/' || v_cohort::text; end if;
  if v_n > 1 then return '/home'; end if;
  -- apprentices: their cohort (first if several)
  select cohort_id into v_cohort from public.enrolments where user_id = auth.uid() and status = 'active' order by created_at limit 1;
  if v_cohort is not null then return '/c/' || v_cohort::text; end if;
  return '/welcome';
end $$;
