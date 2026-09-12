import { getAdminOrg } from "@/lib/auth/org";
import { createClient } from "@/lib/supabase/server";

export default async function OrgPage() {
  const org = (await getAdminOrg())!;
  const supabase = await createClient();
  const [{ count: members }, { count: pending }, { count: cohorts }] = await Promise.all([
    supabase.from("memberships").select("id", { count: "exact", head: true }).eq("org_id", org.id),
    supabase.from("invites").select("id", { count: "exact", head: true }).eq("org_id", org.id).is("accepted_at", null),
    supabase.from("cohorts").select("id", { count: "exact", head: true }).eq("org_id", org.id),
  ]);
  return (
    <div className="max-w-2xl">
      <h1 className="mb-1 text-2xl font-semibold">{org.name}</h1>
      <p className="mb-6 text-sm opacity-70">/{org.slug} · content tier {org.content_tier} · {org.has_minors ? "has minors" : "no minors flagged"} · you are {org.role}</p>
      <dl className="grid grid-cols-3 gap-4 text-sm">
        <div className="rounded-lg border border-ink/10 p-4 dark:border-paper/15"><dt className="opacity-60">Members</dt><dd className="text-2xl">{members ?? 0}</dd></div>
        <div className="rounded-lg border border-ink/10 p-4 dark:border-paper/15"><dt className="opacity-60">Pending invites</dt><dd className="text-2xl">{pending ?? 0}</dd></div>
        <div className="rounded-lg border border-ink/10 p-4 dark:border-paper/15"><dt className="opacity-60">Cohorts</dt><dd className="text-2xl">{cohorts ?? 0}</dd></div>
      </dl>
      <p className="mt-8 text-xs opacity-60">Tiers, flags and courses become editable in later tickets.</p>
    </div>
  );
}
