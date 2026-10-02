"use server";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

const FRIENDLY: Record<string, string> = {
  invite_email_mismatch: "This invite was sent to a different email address. Sign in with that address.",
  invite_already_accepted: "This invite has already been used.",
  invite_expired: "This invite has expired.",
  invite_not_found: "This invite link isn't valid.",
  age_13_plus_required: "Imaje is for people aged 13 and over. Tick the box to confirm you are.",
};

// Runs as the signed-in user: public.accept_invite → eduai.accept_invite(token, auth.uid()).
// One transaction: membership + enrolment/instructor assignment + project membership.
export async function acceptInvite(formData: FormData) {
  const token = String(formData.get("token") ?? "");
  const age13 = formData.get("age_13_plus") === "on";
  const supabase = await createClient();
  const { error } = await supabase.rpc("accept_invite", { p_token: token, p_age_13_plus: age13 });
  if (error) {
    const msg = FRIENDLY[error.message] ?? `Could not accept invite: ${error.message}`;
    redirect(`/login?error=${encodeURIComponent(msg)}&next=${encodeURIComponent(`/invite/${token}`)}`);
  }
  redirect("/");
}
