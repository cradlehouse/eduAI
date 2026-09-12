"use server";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

const FRIENDLY: Record<string, string> = {
  invite_email_mismatch: "This invite was sent to a different email address. Sign in with that address.",
  invite_already_accepted: "This invite has already been used.",
  invite_expired: "This invite has expired.",
  invite_not_found: "This invite link isn't valid.",
};

// Runs as the signed-in user: public.accept_invite → eduai.accept_invite(token, auth.uid()).
// One transaction: membership + enrolment/instructor assignment + project membership.
export async function acceptInvite(formData: FormData) {
  const token = String(formData.get("token") ?? "");
  const supabase = await createClient();
  const { error } = await supabase.rpc("accept_invite", { p_token: token });
  if (error) {
    const msg = FRIENDLY[error.message] ?? `Could not accept invite: ${error.message}`;
    redirect(`/login?error=${encodeURIComponent(msg)}&next=${encodeURIComponent(`/invite/${token}`)}`);
  }
  redirect("/");
}
