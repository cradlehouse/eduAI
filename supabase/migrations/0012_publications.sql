-- 0012: publications — the instructor's Release gate (spec §27), six checks, then Ayrshare.

create type public.publication_status as enum ('draft', 'approved', 'publishing', 'published', 'failed', 'withdrawn');

create table public.publications (
  id                uuid primary key default gen_random_uuid(),
  org_id            uuid not null references public.orgs (id) on delete cascade,
  project_id        uuid not null,
  timeline_id       uuid not null,
  render_asset_id   uuid,
  social_account_id uuid,
  platform          public.social_platform not null,
  release_checks    jsonb not null default '{}'::jsonb,
  status            public.publication_status not null default 'draft',
  approved_by       uuid references public.users (id),
  approved_at       timestamptz,
  external_id       text,
  external_url      text,
  published_at      timestamptz,
  error             text,
  created_by        uuid references public.users (id),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  foreign key (org_id, project_id)       references public.projects        (org_id, id) on delete cascade,
  foreign key (org_id, timeline_id)      references public.timelines       (org_id, id),
  foreign key (org_id, render_asset_id)  references public.assets          (org_id, id),
  foreign key (org_id, social_account_id) references public.social_accounts (org_id, id),
  check (status not in ('approved', 'publishing', 'published') or (approved_by is not null and approved_at is not null)),
  check (status <> 'published' or published_at is not null)
);
comment on column public.publications.release_checks is
  'Six checks, each {"ok": bool, "at": ts, "by": uuid, "note": text}: consent, disclosure, integrity, content_tier, minors, approval.';
create trigger publications_set_updated_at before update on public.publications
  for each row execute function eduai.set_updated_at();
