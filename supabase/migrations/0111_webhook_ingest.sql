-- 0111: public.webhook_ingest — the one write the Cloudflare inbox Worker can do, with the anon key.
-- The inbox is an accelerator, never a source of truth: the orchestrator answers a delivery by asking the
-- vendor for the job's status itself, so a forged row can only make it poll sooner. That is why this
-- needs no secret in the Worker. Replay-safe by (provider, dedupe_key); bodies are capped.
create or replace function public.webhook_ingest(p_provider text, p_dedupe_key text, p_request_id text,
                                                 p_headers jsonb, p_body text, p_signature_ok boolean)
returns boolean
language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  if p_provider not in ('fal', 'replicate', 'runway', 'elevenlabs') then raise exception 'unknown_provider'; end if;
  if length(p_body) > 262144 then raise exception 'body_too_large'; end if;
  insert into public.webhook_inbox (provider, dedupe_key, provider_request_id, headers, body, signature_ok)
  values (p_provider, left(p_dedupe_key, 200), nullif(left(p_request_id, 200), ''), coalesce(p_headers, '{}'::jsonb), p_body, coalesce(p_signature_ok, false))
  on conflict (provider, dedupe_key) do nothing
  returning id into v_id;
  return v_id is not null;
end $$;
revoke all on function public.webhook_ingest(text, text, text, jsonb, text, boolean) from public, authenticated;
grant execute on function public.webhook_ingest(text, text, text, jsonb, text, boolean) to anon;
comment on function public.webhook_ingest is 'Inbox Worker → row. anon-callable on purpose: the orchestrator never trusts the body, it re-polls the vendor.';
