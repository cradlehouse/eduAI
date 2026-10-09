-- Sign-off: one queue for everything that needs someone's OK before it happens (script changes first;
-- later spends, budget top-ups, limit lifts and flagged pictures). Everything starts open: a production
-- has no rules until the educator, or the production itself, adds one, so nothing waits by default.
--
-- projects.signoff: {"script": ["writer"]} or {"script": ["writer", "director"]}. Each listed crew role
-- must sign; a role nobody on the crew holds is signed by the educator (anyone who can manage the
-- project), so work never gets stuck. The educator's sign-off counts for every role.
alter table public.projects add column signoff jsonb not null default '{}'::jsonb;

create table public.signoff_requests (
  id            uuid primary key default gen_random_uuid(),
  org_id        uuid not null references public.orgs (id),
  project_id    uuid not null,
  kind          text not null check (kind in ('script', 'spend', 'budget', 'limit', 'content')),
  title         text not null check (length(title) between 1 and 300),
  -- What would change, for showing (before/after) and for applying once signed.
  detail        jsonb not null default '{}'::jsonb,
  -- The crew roles that must sign, copied from projects.signoff when the request was made.
  roles         text[] not null default '{}',
  -- One entry per role signed: {"role": "writer", "by": uuid, "at": timestamptz}.
  approvals     jsonb not null default '[]'::jsonb,
  status        text not null default 'pending' check (status in ('pending', 'approved', 'returned', 'withdrawn', 'applied', 'failed')),
  note          text check (note is null or length(note) <= 1000),
  requested_by  uuid references auth.users (id) default auth.uid(),
  requested_at  timestamptz not null default now(),
  decided_by    uuid references auth.users (id),
  decided_at    timestamptz,
  foreign key (org_id, project_id) references public.projects (org_id, id) on delete cascade
);
create index signoff_requests_open on public.signoff_requests (project_id, status, requested_at desc);
alter table public.signoff_requests enable row level security;
-- The crew and the educator see and raise requests. Decisions go through decide_signoff() below, and a
-- requester can only withdraw their own pending request.
create policy signoff_select on public.signoff_requests for select to authenticated using (eduai.can_access_project(project_id));
create policy signoff_insert on public.signoff_requests for insert to authenticated
  with check (eduai.can_access_project(project_id) and requested_by = auth.uid() and status = 'pending' and approvals = '[]'::jsonb);
create policy signoff_withdraw on public.signoff_requests for update to authenticated
  using (requested_by = auth.uid() and status = 'pending')
  with check (requested_by = auth.uid() and status in ('pending', 'withdrawn'));
-- Once signed, whoever carries it out (the last signer's page, or the requester) records the outcome.
create policy signoff_apply on public.signoff_requests for update to authenticated
  using (eduai.can_access_project(project_id) and status = 'approved')
  with check (eduai.can_access_project(project_id) and status in ('approved', 'applied', 'failed'));
grant select, insert, update on public.signoff_requests to authenticated;
revoke all on public.signoff_requests from anon;

-- Which of a request's roles the caller can sign: the roles they hold on the crew, plus every role if
-- they manage the project, plus any role nobody on the crew holds when they manage it.
create or replace function public.signoff_roles_for(p_request uuid)
returns text[] language sql stable security invoker set search_path = public as $$
  select coalesce(array_agg(r), '{}') from (
    select unnest(q.roles) r from public.signoff_requests q where q.id = p_request
  ) x
  where eduai.can_manage_project((select project_id from public.signoff_requests where id = p_request))
     or exists (select 1 from public.project_members m
                where m.project_id = (select project_id from public.signoff_requests where id = p_request)
                  and m.user_id = auth.uid() and x.r = any (m.roles))
$$;

-- Sign or send back. Signing adds the caller's roles; the request is approved once every role has
-- signed. Sending back closes it with a note. Security definer so the caller needn't be able to
-- update the row directly; it checks the caller's roles itself.
create or replace function public.decide_signoff(p_request uuid, p_approve boolean, p_note text default null)
returns text language plpgsql security definer set search_path = public as $$
declare
  q public.signoff_requests%rowtype;
  mine text[];
  signed text[];
begin
  select * into q from public.signoff_requests where id = p_request for update;
  if not found or q.status <> 'pending' then raise exception 'not pending'; end if;
  mine := public.signoff_roles_for(p_request);
  if coalesce(array_length(mine, 1), 0) = 0 then raise exception 'not yours to sign'; end if;
  if not p_approve then
    update public.signoff_requests set status = 'returned', note = left(p_note, 1000), decided_by = auth.uid(), decided_at = now() where id = p_request;
    return 'returned';
  end if;
  update public.signoff_requests
     set approvals = approvals || (select coalesce(jsonb_agg(jsonb_build_object('role', r, 'by', auth.uid(), 'at', now())), '[]'::jsonb)
                                    from unnest(mine) r
                                    where not exists (select 1 from jsonb_array_elements(q.approvals) a where a->>'role' = r)),
         note = coalesce(left(p_note, 1000), note)
   where id = p_request
  returning array(select a->>'role' from jsonb_array_elements(approvals) a) into signed;
  if (select bool_and(r = any (signed)) from unnest(q.roles) r) then
    update public.signoff_requests set status = 'approved', decided_by = auth.uid(), decided_at = now() where id = p_request;
    return 'approved';
  end if;
  return 'pending';
end $$;
revoke all on function public.decide_signoff(uuid, boolean, text) from public, anon;
grant execute on function public.decide_signoff(uuid, boolean, text) to authenticated;
revoke all on function public.signoff_roles_for(uuid) from public, anon;
grant execute on function public.signoff_roles_for(uuid) to authenticated;
