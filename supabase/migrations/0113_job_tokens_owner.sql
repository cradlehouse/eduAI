-- 0113: job_tokens must run as its owner (as in 0108), not the caller: students have no grant on
-- jobs.estimated_cents/actual_cents and the view is what hides cents behind tokens. 0112 recreated it
-- with security_invoker = true by mistake; RLS still applies via eduai.can_access_project in the WHERE.
alter view public.job_tokens set (security_invoker = false);
