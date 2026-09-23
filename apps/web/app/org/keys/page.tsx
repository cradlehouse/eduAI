import { getAdminOrg } from "@/lib/auth/org";
import { createClient } from "@/lib/supabase/server";
import { addKey, revokeKey } from "./actions";

const PROVIDERS: { key: string; label: string; where: string }[] = [
  { key: "fal", label: "fal.ai", where: "fal.ai → Keys" },
  { key: "replicate", label: "Replicate", where: "replicate.com → API tokens" },
];

// A school's own vendor keys. The key is stored in Supabase Vault and never shown again; the
// orchestrator uses it for routes whose credential policy allows an org key, and the vendor then
// bills the school directly. Tokens still track usage so budgets and receipts stay complete.
export default async function KeysPage({ searchParams }: { searchParams: Promise<{ ok?: string; error?: string }> }) {
  const { ok, error } = await searchParams;
  const org = (await getAdminOrg())!;
  const supabase = await createClient();
  const { data: creds } = await supabase.from("org_credentials").select("id, provider, label, created_at, revoked_at, users(email)").eq("org_id", org.id).order("created_at", { ascending: false });
  const active = (creds ?? []).filter((c) => !c.revoked_at);

  return (
    <div className="max-w-3xl">
      <h1 className="display mb-1 text-2xl">Your own keys</h1>
      <p className="mb-6 max-w-[62ch] text-sm text-dim">
        Add a vendor key and the school pays that vendor directly for generation on its routes, instead of drawing on the plan&apos;s allowance.
        Keys are stored encrypted, never shown again, and can be revoked here at any time. Students see nothing change: routes, tokens and receipts work the same.
      </p>
      {ok && <p className="mb-4 rounded-[6px] bg-ok/10 p-2 text-sm text-ok">{ok}</p>}
      {error && <p className="mb-4 rounded-[6px] bg-drift/10 p-2 text-sm text-drift">{error}</p>}

      <div className="grid gap-4 sm:grid-cols-2">
        {PROVIDERS.map((p) => {
          const cur = active.find((c) => c.provider === p.key);
          return (
            <section key={p.key} className="card p-4" style={{ borderRadius: 10 }}>
              <div className="flex items-baseline justify-between"><h2 className="display">{p.label}</h2>{cur ? <span className="pill bg-ok/15 text-ok text-xs">your key</span> : <span className="pill text-xs text-dim">platform key</span>}</div>
              {cur ? (
                <div className="mt-2 text-sm">
                  <div>{cur.label || "unlabelled"} <span className="text-xs text-dim">· added {new Date(cur.created_at).toLocaleDateString()} by {cur.users?.email ?? "?"}</span></div>
                  <form action={revokeKey} className="mt-3"><input type="hidden" name="id" value={cur.id} /><button className="btn text-xs text-drift">Revoke</button></form>
                </div>
              ) : (
                <form action={addKey} className="mt-2 flex flex-col gap-2 text-sm">
                  <input type="hidden" name="provider" value={p.key} />
                  <input name="secret" type="password" autoComplete="off" required minLength={8} placeholder={`Paste the key from ${p.where}`} className="input w-full" />
                  <div className="flex gap-2"><input name="label" placeholder="label, e.g. Pegasus fal account" className="input flex-1" /><button className="btn-primary">Add key</button></div>
                </form>
              )}
            </section>
          );
        })}
      </div>

      {(creds ?? []).some((c) => c.revoked_at) && (
        <section className="mt-6 text-xs text-dim">
          <div className="label mb-1">Revoked</div>
          <ul>{(creds ?? []).filter((c) => c.revoked_at).map((c) => <li key={c.id}>{c.provider} · {c.label || "unlabelled"} · revoked {new Date(c.revoked_at!).toLocaleDateString()}</li>)}</ul>
        </section>
      )}
    </div>
  );
}
