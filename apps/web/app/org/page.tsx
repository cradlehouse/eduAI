import Link from "next/link";
import { getAdminOrg } from "@/lib/auth/org";
import { createClient } from "@/lib/supabase/server";
import { setBilling, setPlan, setTokenRate } from "./actions";

const money = (cents: number | null) => `$${((cents ?? 0) / 100).toLocaleString(undefined, { minimumFractionDigits: 2 })}`;

export default async function OrgPage({ searchParams }: { searchParams: Promise<{ ok?: string; error?: string }> }) {
  const { ok, error } = await searchParams;
  const org = (await getAdminOrg())!;
  const supabase = await createClient();
  const [{ data: plans }, { data: orgRow }, { data: spend }] = await Promise.all([
    supabase.from("plans").select("key, name, monthly_cents, seats, token_cents_per_month, blurb").order("sort"),
    supabase.from("orgs").select("plan, plan_started_on, card_on_file, overage_allowed, billing_email, tokens_per_dollar").eq("id", org.id).maybeSingle(),
    supabase.from("org_spend_monthly").select("month, spent_cents").eq("org_id", org.id).order("month", { ascending: false }).limit(6),
  ]);
  const plan = (plans ?? []).find((p) => p.key === orgRow?.plan) ?? null;
  const thisMonth = new Date().toISOString().slice(0, 7);
  const spentThisMonth = (spend ?? []).find((m) => String(m.month).slice(0, 7) === thisMonth)?.spent_cents ?? 0;
  const rate = orgRow?.tokens_per_dollar ?? 1000;
  const tokens = (cents: number) => Math.round((cents / 100) * rate).toLocaleString();
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
      <h1 className="mb-1 display text-2xl">{org.name}</h1>
      <p className="mb-6 text-sm opacity-70">/{org.slug} · content tier {org.content_tier} · {org.has_minors ? "has minors" : "no minors flagged"} · you are {org.role}</p>
      {ok && <p className="mb-4 rounded-[12px] bg-control/10 p-2 text-sm text-control">{ok}</p>}
      {error && <p className="mb-4 rounded-[12px] bg-danger/10 p-2 text-sm text-danger">{error}</p>}

      <section className="mb-8 card p-5" style={{ borderRadius: 18 }}>
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <div><div className="label">Your plan</div><h2 className="display text-xl">{plan ? `${plan.name} · ${money(plan.monthly_cents)} a month` : "No plan set"}</h2></div>
          {orgRow?.plan_started_on && <span className="text-xs text-muted">since {orgRow.plan_started_on}</span>}
        </div>
        {plan && <p className="mt-1 text-sm text-muted">{plan.blurb}</p>}
        {plan && (
          <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
            <div className="rounded-[12px] bg-sand p-3"><dt className="label">People</dt><dd className="text-xl">{members ?? 0} <span className="text-sm text-muted">of {plan.seats}</span></dd></div>
            <div className="rounded-[12px] bg-sand p-3"><dt className="label">Generation this month</dt><dd className="text-xl">{money(spentThisMonth)} <span className="text-sm text-muted">of {money(plan.token_cents_per_month)}</span></dd><dd className="text-xs text-muted">{tokens(spentThisMonth)} of {tokens(plan.token_cents_per_month)} tokens</dd></div>
            <div className="rounded-[12px] bg-sand p-3"><dt className="label">Card on file</dt><dd className="text-xl">{orgRow?.card_on_file ? "yes" : "none"}</dd><dd className="text-xs text-muted">{orgRow?.overage_allowed ? "overages allowed" : "stops at the allowance"}</dd></div>
          </dl>
        )}
        <div className="mt-4 flex flex-wrap items-center gap-2">
          {(plans ?? []).filter((p) => p.key !== orgRow?.plan).map((p) => (
            <form key={p.key} action={setPlan}><input type="hidden" name="plan" value={p.key} />
              <button className={p.monthly_cents > (plan?.monthly_cents ?? 0) ? "btn-primary" : "btn"}>{p.monthly_cents > (plan?.monthly_cents ?? 0) ? "Upgrade to" : "Switch to"} {p.name} · {money(p.monthly_cents)}/month · {p.seats} people · {money(p.token_cents_per_month)}/month generation</button>
            </form>
          ))}
          <Link href="/org/cohorts" className="btn">Add tokens to a project</Link>
          <button className="btn opacity-60" disabled title="Card payments are not connected yet; plans are invoiced.">Add a card · coming</button>
        </div>
        <form action={setBilling} className="mt-4 flex flex-wrap items-center gap-3 border-t border-line pt-3 text-sm">
          <label className="flex items-center gap-2"><span className="label">Billing email</span><input name="billing_email" type="email" defaultValue={orgRow?.billing_email ?? ""} placeholder="finance@school.org" className="input w-64" /></label>
          <label className="flex items-center gap-2"><input type="checkbox" name="overage_allowed" defaultChecked={!!orgRow?.overage_allowed} /> allow generation past the monthly allowance (needs a card)</label>
          <button className="btn">Save</button>
        </form>
      </section>

      <dl className="mb-8 grid grid-cols-3 gap-4 text-sm">
        <div className="card p-4"><dt className="opacity-60">Members</dt><dd className="text-2xl">{members ?? 0}</dd></div>
        <div className="card p-4"><dt className="opacity-60">Pending invites</dt><dd className="text-2xl">{pending ?? 0}</dd></div>
        <Link href="/org/cohorts" className="card p-4 hover:bg-sand"><dt className="opacity-60">Cohorts</dt><dd className="text-2xl">{cohorts ?? 0}</dd></Link>
      </dl>

      <section className="mb-8 card p-4">
        <h2 className="mb-1 font-medium">Token rate</h2>
        <p className="mb-3 text-xs opacity-70">Only admins see money. Everyone else sees tokens. Changing the rate rescales how existing budgets display; it does not move money.</p>
        <form action={setTokenRate} className="flex items-center gap-2 text-sm">
          $1 =
          <input name="tokens_per_dollar" type="number" min={1} step={1} defaultValue={org.tokens_per_dollar} className="w-28 rounded border border-ink/20 bg-white px-2 py-1 text-ink" />
          tokens
          <button className="btn">Save</button>
        </form>
      </section>

      <section className="card p-4">
        <h2 className="mb-1 font-medium">Money</h2>
        <p className="mb-3 text-xs opacity-70">Real cost across project budgets: {money(totals.spent)} spent of {money(totals.total)} allocated.</p>
        {(budgets ?? []).length === 0 ? <p className="text-sm opacity-60">No project budgets yet.</p> : (
          <table className="w-full text-sm">
            <thead className="label text-left"><tr><th className="py-1">Project</th><th>Allocated</th><th>Spent</th><th>Reserved</th><th>Remaining</th><th>Tokens</th></tr></thead>
            <tbody>
              {(budgets ?? []).map((b) => (
                <tr key={b.project_id} className="border-t border-line">
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
