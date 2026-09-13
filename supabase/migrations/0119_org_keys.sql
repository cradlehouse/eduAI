-- 0119: a school's own vendor keys (credential mode "org"). The key goes into Supabase Vault; the
-- org_credentials row holds only the Vault id. Admin-only, via two RPCs so the browser never touches
-- vault.* directly. The orchestrator already prefers an org key when the route's policy allows it.
create or replace function public.add_org_credential(p_org uuid, p_provider text, p_secret text, p_label text default '')
returns uuid
language plpgsql security definer set search_path = public, vault as $$
declare v_secret uuid; v_id uuid;
begin
  if not eduai.is_org_admin(p_org) then raise exception 'not_admin' using errcode = '42501'; end if;
  if p_provider not in ('fal', 'replicate', 'runway', 'elevenlabs', 'ayrshare') then raise exception 'unknown_provider'; end if;
  if length(coalesce(p_secret, '')) < 8 then raise exception 'secret_too_short'; end if;
  -- one active key per provider: retire the old one (its secret is scrubbed, not kept)
  update public.org_credentials set revoked_at = now() where org_id = p_org and provider = p_provider and revoked_at is null;
  v_secret := vault.create_secret(p_secret, 'org:' || p_org || ':' || p_provider || ':' || gen_random_uuid(), 'Imaje org vendor key');
  insert into public.org_credentials (org_id, provider, secret_ref, label, created_by)
  values (p_org, p_provider, v_secret, left(coalesce(p_label, ''), 80), auth.uid()) returning id into v_id;
  return v_id;
end $$;
revoke all on function public.add_org_credential(uuid, text, text, text) from public, anon;
grant execute on function public.add_org_credential(uuid, text, text, text) to authenticated;

create or replace function public.revoke_org_credential(p_id uuid)
returns boolean
language plpgsql security definer set search_path = public, vault as $$
declare c public.org_credentials;
begin
  select * into c from public.org_credentials where id = p_id;
  if not found then return false; end if;
  if not eduai.is_org_admin(c.org_id) then raise exception 'not_admin' using errcode = '42501'; end if;
  update public.org_credentials set revoked_at = now() where id = p_id and revoked_at is null;
  -- scrub the secret; the row stays for the audit trail
  perform vault.update_secret(c.secret_ref, 'revoked');
  return true;
end $$;
revoke all on function public.revoke_org_credential(uuid) from public, anon;
grant execute on function public.revoke_org_credential(uuid) to authenticated;
