One file per table. `scripts/build-policies.sh` concatenates them (alphabetically) into
`migrations/0101_rls_policies.sql`; CI fails if that file is stale. Edit here, never there.

Conventions
- Roles: `authenticated` only. `anon` gets nothing. `service_role` bypasses RLS.
- Helpers live in schema `eduai` (0002–0004): is_org_member, is_org_admin, can_view_cohort,
  can_manage_cohort, can_access_project (member OR instructor OR admin), can_manage_project
  (instructor OR admin), is_minor_in, can_grant_role.
- A table with no policy file is intentionally service-role only (webhook_inbox).

**After 0101:** the files here are the snapshot applied by `0101`. Later policy changes go in a new
migration (`drop policy … ; create policy …`) so applied migrations are never edited. Current
divergences: `ledger_select` is admin-only since `0104_tokens.sql`.
