-- 0014: webhook inbox. The Cloudflare Worker verifies the signature and inserts here (service role);
-- the orchestrator drains it. No org_id: the org is unknown until the job is looked up.
-- (provider, dedupe_key) unique ⇒ a replayed delivery is a no-op insert.

create table public.webhook_inbox (
  id                  uuid primary key default gen_random_uuid(),
  provider            text not null,
  dedupe_key          text not null,
  provider_request_id text,
  headers             jsonb not null default '{}'::jsonb,
  body                text not null,
  signature_ok        boolean not null,
  received_at         timestamptz not null default now(),
  processed_at        timestamptz,
  attempts            integer not null default 0,
  error               text,
  unique (provider, dedupe_key)
);
create index webhook_inbox_pending_idx on public.webhook_inbox (received_at) where processed_at is null;

-- Drain: hand a worker up to p_limit unprocessed rows, locked, so two drainers never
-- process the same delivery. Caller marks processed_at (or error + attempts) per row.
create or replace function eduai.claim_inbox(p_limit integer default 50)
returns setof public.webhook_inbox
language sql security definer set search_path = public as $$
  update public.webhook_inbox w
     set attempts = attempts + 1
   where id in (
     select id from public.webhook_inbox
      where processed_at is null and attempts < 10
      order by received_at
      for update skip locked
      limit p_limit)
  returning *
$$;
