import { Card } from "@/components/Card";
import { createClient } from "@/lib/supabase/server";

export default async function OrgStub() {
  const supabase = await createClient();
  const { data: orgs } = await supabase.from("memberships").select("role, orgs(name, content_tier)").in("role", ["admin", "owner"]);
  return (
    <Card title="Organisation">
      {(orgs ?? []).map((m, i) => (
        <p key={i} className="text-sm">{m.orgs?.name} · tier {m.orgs?.content_tier} · you are {m.role}</p>
      ))}
      <p className="mt-4 text-xs opacity-60">People and invite flow arrive in P1-04.</p>
    </Card>
  );
}
