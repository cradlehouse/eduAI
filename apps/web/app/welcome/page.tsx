import { Card } from "@/components/Card";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "./actions";

export default async function Welcome() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const [{ data: memberships }, { data: enrolments }] = await Promise.all([
    supabase.from("memberships").select("role, orgs(name)"),
    supabase.from("enrolments").select("cohorts(name)"),
  ]);
  return (
    <Card title="You're signed in">
      <p className="mb-2 text-sm"><strong>{user?.email}</strong></p>
      {(memberships ?? []).length > 0 && (
        <ul className="mb-2 text-sm">{(memberships ?? []).map((m, i) => <li key={i}>{m.orgs?.name} · {m.role}</li>)}</ul>
      )}
      {(enrolments ?? []).length > 0 && (
        <p className="mb-2 text-sm">Enrolled in {(enrolments ?? []).map((e) => e.cohorts?.name).join(", ")}.</p>
      )}
      <p className="mb-3 text-sm opacity-80">
        You&apos;re not on a project yet. Your instructor or programme lead adds you to one; then this page becomes your project dashboard.
      </p>
      <form action={signOut}><button className="text-sm underline" type="submit">Sign out</button></form>
    </Card>
  );
}
