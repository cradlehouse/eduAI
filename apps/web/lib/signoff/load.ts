import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { ScriptDetail } from "./server";

export type SignoffItem = {
  id: string; projectId: string; projectTitle: string; kind: string; title: string; status: string; note: string | null;
  roles: string[]; signed: string[]; mineToSign: string[]; mine: boolean; by: string; at: string;
  before: string; after: string;
};

// Open requests (and the last few closed ones) on one production, or every open one the caller can see
// across their productions (for Home). mineToSign says which roles the caller could sign now.
export async function loadSignoffs(opts: { projectId?: string; onlyOpen?: boolean }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  let q = supabase.from("signoff_requests").select("id, project_id, kind, title, detail, status, note, roles, approvals, requested_by, requested_at, projects(title)").order("requested_at", { ascending: false }).limit(40);
  if (opts.projectId) q = q.eq("project_id", opts.projectId);
  if (opts.onlyOpen) q = q.eq("status", "pending");
  const { data: rows } = await q;
  const list = (rows ?? []).filter((r) => r.status === "pending" || opts.projectId).slice(0, 20);
  const who = [...new Set(list.map((r) => r.requested_by).filter((x): x is string => !!x))];
  const { data: people } = who.length ? await supabase.from("users").select("id, email, display_name").in("id", who) : { data: [] as { id: string; email: string; display_name: string | null }[] };
  const name = (id: string | null) => { const u = (people ?? []).find((p) => p.id === id); return u ? u.display_name || u.email.split("@")[0] : ""; };
  const items: SignoffItem[] = [];
  for (const r of list) {
    const signed = ((r.approvals ?? []) as { role: string }[]).map((a) => a.role);
    const { data: can } = r.status === "pending" ? await supabase.rpc("signoff_roles_for", { p_request: r.id }) : { data: [] as string[] };
    const d = (r.detail ?? {}) as Partial<ScriptDetail>;
    items.push({
      id: r.id, projectId: r.project_id, projectTitle: (r.projects as { title?: string } | null)?.title ?? "", kind: r.kind, title: r.title, status: r.status, note: r.note,
      roles: r.roles, signed, mineToSign: (can ?? []).filter((x: string) => !signed.includes(x)), mine: r.requested_by === user?.id,
      by: name(r.requested_by), at: r.requested_at, before: d.before ?? "", after: d.after ?? "",
    });
  }
  return items;
}
