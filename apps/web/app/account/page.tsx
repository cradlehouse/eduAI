import { redirect } from "next/navigation";
import { Shell } from "@/components/Shell";
import { getNav } from "@/lib/auth/nav";
import { createClient } from "@/lib/supabase/server";
import { PasswordForm } from "./PasswordForm";
import { saveDisplayName } from "./actions";

export default async function AccountPage({ searchParams }: { searchParams: Promise<{ set?: string; saved?: string }> }) {
  const { set, saved } = await searchParams;
  const nav = await getNav();
  if (!nav) redirect("/login");
  const supabase = await createClient();
  const [{ data: me }, { data: { user } }] = await Promise.all([
    supabase.from("users").select("display_name").eq("id", nav.userId).maybeSingle(),
    supabase.auth.getUser(),
  ]);
  const providers: string[] = (user?.app_metadata?.providers as string[] | undefined) ?? [];
  const hasPassword = providers.includes("email") && Boolean(user?.user_metadata?.has_password);

  return (
    <Shell nav={nav} crumbs={[{ label: nav.org?.name ?? "Imaje", href: "/home", image: nav.org?.mark_url }, { label: "Account" }]}>
      <div className="max-w-md">
        <h1 className="display mb-1 text-2xl">Account</h1>
        <p className="mb-6 text-sm text-muted">{nav.email}</p>

        <section className="card mb-4 p-4">
          <div className="label mb-2">Name</div>
          <form action={saveDisplayName} className="flex gap-2">
            <input name="display_name" defaultValue={me?.display_name ?? ""} placeholder="How your team sees you" className="input flex-1" maxLength={80} />
            <button className="btn" type="submit">Save</button>
          </form>
          {saved === "name" && <p className="mt-2 text-xs text-money">Saved.</p>}
        </section>

        <section className="card p-4">
          <div className="label mb-2">Password</div>
          <p className="mb-3 text-xs text-muted">
            {set === "password" ? "Choose a new password." : hasPassword ? "Change your password." : "Set a password so you can sign in without an emailed link."}
          </p>
          <PasswordForm />
          {providers.includes("google") && <p className="mt-3 text-xs text-muted">Google sign-in is linked to this account.</p>}
        </section>
      </div>
    </Shell>
  );
}
