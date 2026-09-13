-- 0116: an org's own branding. logo_url = horizontal wordmark, mark_url = square symbol. Paths are
-- public URLs (served from the web app or R2); null ⇒ text only.
alter table public.orgs add column logo_url text, add column mark_url text;
