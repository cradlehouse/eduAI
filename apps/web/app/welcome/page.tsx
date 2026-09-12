import { Card } from "@/components/Card";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "./actions";

export default async function Welcome() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return (
    <Card title="You're signed in">
      <p className="mb-3 text-sm">
        <strong>{user?.email}</strong> isn&apos;t in a cohort or project yet. Your programme lead sends invites by email;
        open the link in the invite and you&apos;ll land in the right place.
      </p>
      <form action={signOut}><button className="text-sm underline" type="submit">Sign out</button></form>
    </Card>
  );
}
