"use server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { applyScriptSignoff } from "@/lib/signoff/server";
import { syncScenes } from "@/lib/script/sync";

type R = { ok: true; message?: string } | { error: string };

// Sign (or send back) a request. Signing the last role carries the change out straight away.
export async function decideSignoff(projectId: string, requestId: string, approve: boolean, note: string): Promise<R> {
  const supabase = await createClient();
  if (!approve && note.trim().length < 3) return { error: "Say what to change, so they know what to do." };
  const { data: state, error } = await supabase.rpc("decide_signoff", { p_request: requestId, p_approve: approve, p_note: note.trim() || undefined });
  if (error) return { error: error.message.includes("not yours") ? "This one isn't yours to sign." : error.message.includes("not pending") ? "Someone already dealt with this one." : error.message };
  let message = state === "approved" ? "Signed off." : state === "returned" ? "Sent back with your note." : "Signed. Waiting for the others.";
  if (state === "approved") {
    const { data: q } = await supabase.from("signoff_requests").select("kind").eq("id", requestId).maybeSingle();
    if (q?.kind === "script") {
      const a = await applyScriptSignoff(requestId);
      if ("error" in a) return { error: a.error ?? "Couldn't apply it." };
      await syncScenes(projectId, a.after);
      message = "Signed off and added to the script.";
    }
  }
  revalidatePath(`/p/${projectId}`, "layout");
  revalidatePath("/home");
  return { ok: true, message };
}

export async function withdrawSignoff(projectId: string, requestId: string): Promise<R> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("signoff_requests").update({ status: "withdrawn" }).eq("id", requestId).eq("status", "pending").select("id");
  if (error || !data?.length) return { error: error?.message ?? "Only the person who asked can withdraw it, while it's waiting." };
  revalidatePath(`/p/${projectId}`, "layout");
  return { ok: true };
}

// Who signs script changes. Everything starts open; the educator can set any rule, and the crew can only
// make it stricter (add roles), never looser.
export async function setScriptSignoff(projectId: string, roles: string[]): Promise<R> {
  const supabase = await createClient();
  const [{ data: project }, { data: manage }] = await Promise.all([
    supabase.from("projects").select("signoff").eq("id", projectId).maybeSingle(),
    supabase.rpc("can_manage_project_for", { p_project: projectId }),
  ]);
  if (!project) return { error: "Project not found." };
  const rules = (project.signoff ?? {}) as Record<string, string[]>;
  const now = rules.script ?? [];
  const next = [...new Set(roles.filter(Boolean))];
  if (!manage && !now.every((r) => next.includes(r))) return { error: "Only your educator can loosen sign-off. You can make it stricter." };
  const { data, error } = await supabase.from("projects").update({ signoff: { ...rules, script: next } }).eq("id", projectId).select("id");
  if (error || !data?.length) return { error: error?.message ?? "You can't change this production's settings." };
  revalidatePath(`/p/${projectId}`, "layout");
  return { ok: true, message: next.length ? `Script changes now need sign-off from the ${next.join(" and the ")}.` : "Anyone on the crew can change the script." };
}
