import Link from "next/link";
import { redirect } from "next/navigation";
import { Card } from "@/components/Card";
import { createClient } from "@/lib/supabase/server";
import { acceptInvite } from "./actions";

const ROLE_LABEL = { student: "apprentice", instructor: "instructor", admin: "admin", owner: "owner" } as const;

export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const supabase = await createClient();

  const { data: rows, error } = await supabase.rpc("invite_preview", { p_token: token });
  if (error) throw new Error(`invite_preview failed: ${error.message}`);
  const invite = rows?.[0];

  if (!invite || invite.status === "not_found") {
    return <Card title="Invite not found"><p className="text-sm">This link isn&apos;t valid. Ask your programme lead for a new one.</p></Card>;
  }
  if (invite.status === "expired") {
    return <Card title="Invite expired"><p className="text-sm">This invite to {invite.org_name} has expired. Ask your programme lead for a new one.</p></Card>;
  }

  const { data: { user } } = await supabase.auth.getUser();

  if (invite.status === "accepted") {
    if (user) redirect("/");
    return (
      <Card title="Already accepted">
        <p className="text-sm">This invite has been used. <Link className="underline" href={`/login?next=${encodeURIComponent(`/invite/${token}`)}`}>Sign in</Link> to continue.</p>
      </Card>
    );
  }

  const summary = (
    <dl className="mb-4 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
      {invite.org_logo && (
        <dd className="col-span-2 mb-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={invite.org_logo} alt={invite.org_name ?? ""} className="h-12 w-auto" />
        </dd>
      )}
      <dt className="opacity-70">Organisation</dt><dd>{invite.org_name}</dd>
      <dt className="opacity-70">Role</dt><dd>{invite.role ? ROLE_LABEL[invite.role] : ""}</dd>
      {invite.cohort_name && <><dt className="opacity-70">Cohort</dt><dd>{invite.cohort_name}</dd></>}
      {invite.project_title && <><dt className="opacity-70">Project</dt><dd>{invite.project_title}</dd></>}
      <dt className="opacity-70">Sent to</dt><dd>{invite.email_masked}</dd>
    </dl>
  );

  if (!user) {
    return (
      <Card title={`You're invited to ${invite.org_name}`}>
        {summary}
        <p className="mb-3 text-sm">Sign in with the invited email address to accept.</p>
        <Link
          className="btn-primary block text-center"
          href={`/login?next=${encodeURIComponent(`/invite/${token}`)}`}
        >
          Sign in to accept
        </Link>
      </Card>
    );
  }

  return (
    <Card title={`Join ${invite.org_name}`}>
      {summary}
      <p className="mb-3 text-sm">Signed in as <strong>{user.email}</strong>.</p>
      <form action={acceptInvite}>
        <input type="hidden" name="token" value={token} />
        <button type="submit" className="w-full btn-primary">
          Accept invite
        </button>
      </form>
    </Card>
  );
}
