import { getAdminOrg } from "@/lib/auth/org";
import { createClient } from "@/lib/supabase/server";
import { setTokenRate } from "./actions";

const money = (cents: number | null) => `$${((cents ?? 0) / 100).toLocaleString(undefined, { minimumFractionDigits: 2 })}`;

export default async function OrgPage({ searchParams }: { searchParams: Promise<{ ok?: string; error?: string }> }) {
  const { ok, error } = await searchParams;
  const org = (await getAdminOrg())!;
  const supabase = await createClient();
  const [{ count: members }, { count: pending }, { count: cohorts }, { data: budgets }] = await Promise.all([
    supabase.from("memberships").select("id", { count: "exact", head: true }).eq("org_id", org.id),
    supabase.from("invites").select("id", { count: "exact", head: true }).eq("org_id", org.id).is("accepted_at", null),
    supabase.from("cohorts").select("id", { count: "exact", head: true }).eq("org_id", org.id),
    supabase.from("project_budget_admin").select("project_id, total_cents, spent_cents, remaining_cents, reserved_open_cents, total_tokens, spent_tokens").eq("org_id", org.id),
  ]);
  const { data: projects } = await supabase.from("projects").select("id, title").eq("org_id", org.id);
  const title = (id: string) => projects?.find((p) => p.id === id)?.title ?? id;
  const totals = (budgets ?? []).reduce((a, b) => ({ total: a.total + (b.total_cents ?? 0), spent: a.spent + (b.spent_cents ?? 0) }), { total: 0, spent: 0 });

  return (
    <div className="max-w-3xl">
      <h1 className="mb-1 text-2xl font-semibold">{org.name}</h1>
      <p className="mb-6 text-sm opacity-70">/{org.slug} · content tier {org.content_tier} · {org.has_minors ? "has minors" : "no minors flagged"} · you are {org.role}</p>
      {ok && <p className="mb-4 rounded bg-money/10 p-2 text-sm text-money">{ok}</p>}
      {error && <p className="mb-4 rounded bg-danger/10 p-2 text-sm text-danger">{error}</p>}

      <dl className="mb-8 grid grid-cols-3 gap-4 text-sm">
        <div className="rounded-lg border border-ink/10 p-4 dark:border-paper/15"><dt className="opacity-60">Members</dt><dd className="text-2xl">{members ?? 0}</dd></div>
        <div className="rounded-lg border border-ink/10 p-4 dark:border-paper/15"><dt className="opacity-60">Pending invites</dt><dd className="text-2xl">{pending ?? 0}</dd></div>
        <div className="rounded-lg border border-ink/10 p-4 dark:border-paper/15"><dt className="opacity-60">Cohorts</dt><dd className="text-2xl">{cohorts ?? 0}</dd></div>
      </dl>

      <section className="mb-8 rounded-lg border border-ink/10 p-4 dark:border-paper/15">
        <h2 className="mb-1 font-medium">Token rate</h2>
        <p className="mb-3 text-xs opacity-70">Only admins see money. Everyone else sees tokens. Changing the rate rescales how existing budgets display; it does not move money.</p>
        <form action={setTokenRate} className="flex items-center gap-2 text-sm">
          $1 =
          <input name="tokens_per_dollar" type="number" min={1} step={1} defaultValue={org.tokens_per_dollar} className="w-28 rounded border border-ink/20 bg-white px-2 py-1 text-ink dark:border-paper/20" />
          tokens
          <button className="rounded border border-ink/20 px-2 py-1 text-xs hover:bg-ink/5 dark:border-paper/20 dark:hover:bg-paper/10">Save</button>
        </form>
      </section>

      <section className="rounded-lg border border-ink/10 p-4 dark:border-paper/15">
        <h2 className="mb-1 font-medium">Money</h2>
        <p className="mb-3 text-xs opacity-70">Real cost across project budgets: {money(totals.spent)} spent of {money(totals.total)} allocated.</p>
        {(budgets ?? []).length === 0 ? <p className="text-sm opacity-60">No project budgets yet.</p> : (
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase opacity-60"><tr><th className="py-1">Project</th><th>Allocated</th><th>Spent</th><th>Reserved</th><th>Remaining</th><th>Tokens</th></tr></thead>
            <tbody>
              {(budgets ?? []).map((b) => (
                <tr key={b.project_id} className="border-t border-ink/10 dark:border-paper/10">
                  <td className="py-1">{title(b.project_id!)}</td>
                  <td>{money(b.total_cents)}</td><td>{money(b.spent_cents)}</td><td>{money(b.reserved_open_cents)}</td><td>{money(b.remaining_cents)}</td>
                  <td className="opacity-70">{(b.spent_tokens ?? 0).toLocaleString()} / {(b.total_tokens ?? 0).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
