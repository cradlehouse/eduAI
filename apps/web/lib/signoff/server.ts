import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { Json } from "@/lib/db/types";

export type SignoffKind = "script" | "spend" | "budget" | "limit" | "content";
export type ScriptDetail = { before: string; after: string; label: string; source: string; scene: number | null; snippet: string };

// Who has to sign this kind of change on this production (projects.signoff), and whether the caller
// can go ahead without asking: they manage the project, or they hold every role that has to sign.
export async function signoffFor(projectId: string, kind: SignoffKind) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const [{ data: project }, { data: me }, { data: manage }] = await Promise.all([
    supabase.from("projects").select("signoff, cohort_id").eq("id", projectId).maybeSingle(),
    user ? supabase.from("project_members").select("roles").eq("project_id", projectId).eq("user_id", user.id).maybeSingle() : Promise.resolve({ data: null }),
    supabase.rpc("can_manage_project_for", { p_project: projectId }),
  ]);
  const rules = (project?.signoff ?? {}) as Record<string, string[]>;
  const roles = (rules[kind] ?? []).filter(Boolean);
  const mine = me?.roles ?? [];
  const free = roles.length === 0 || !!manage || roles.every((r) => mine.includes(r));
  return { roles, free, mine, userId: user?.id ?? null };
}

// Raise a request. The caller's own roles sign it straight away (a writer proposing a change that needs
// the writer and the director only waits for the director). Returns whether it's already approved.
export async function requestSignoff(projectId: string, kind: SignoffKind, title: string, detail: Json, roles: string[]) {
  const supabase = await createClient();
  const { data: project } = await supabase.from("projects").select("org_id").eq("id", projectId).maybeSingle();
  if (!project) return { error: "Project not found." } as const;
  const { data: row, error } = await supabase.from("signoff_requests").insert({ org_id: project.org_id, project_id: projectId, kind, title: title.slice(0, 300), detail, roles }).select("id").single();
  if (error || !row) return { error: error?.message ?? "Couldn't send it for sign-off." } as const;
  const { data: mine } = await supabase.rpc("signoff_roles_for", { p_request: row.id });
  if (mine?.length) {
    const { data: state } = await supabase.rpc("decide_signoff", { p_request: row.id, p_approve: true });
    if (state === "approved") return { id: row.id, approved: true } as const;
  }
  return { id: row.id, approved: false } as const;
}

// Carry out a signed script change. It only goes in if the script is still as it was when the change
// was proposed; otherwise it's marked failed and the proposer is asked to make it again.
export async function applyScriptSignoff(requestId: string) {
  const supabase = await createClient();
  const { data: q } = await supabase.from("signoff_requests").select("id, project_id, org_id, detail, status, requested_by").eq("id", requestId).maybeSingle();
  if (!q || q.status !== "approved") return { error: "That request isn't approved." } as const;
  const d = q.detail as unknown as ScriptDetail;
  const { data: proj } = await supabase.from("projects").select("script").eq("id", q.project_id).maybeSingle();
  if ((proj?.script ?? "") !== d.before) {
    await supabase.from("signoff_requests").update({ status: "failed", note: "The script changed after this was proposed. Propose it again." }).eq("id", requestId);
    return { error: "The script changed after this was proposed, so it wasn't applied. Ask them to propose it again." } as const;
  }
  const { error } = await supabase.from("projects").update({ script: d.after, script_updated_at: new Date().toISOString() }).eq("id", q.project_id);
  if (error) return { error: error.message } as const;
  await supabase.from("script_changes").insert({ org_id: q.org_id, project_id: q.project_id, source: d.source as "scene", label: `${d.label} (signed off)`, snippet: d.snippet, scene_position: d.scene, created_by: q.requested_by });
  await supabase.from("signoff_requests").update({ status: "applied" }).eq("id", requestId);
  return { ok: true, projectId: q.project_id, after: d.after } as const;
}
