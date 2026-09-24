-- 0123: 0121 recreated job_tokens and, like 0112 before it, left security_invoker on. Same fix as
-- 0113: the view runs as its owner so students never need a grant on jobs.*_cents; RLS still applies
-- through eduai.can_access_project in the WHERE. (The 0122 column grant stays; it is harmless.)
alter view public.job_tokens set (security_invoker = false);
