"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

const back = (projectId: string, msg?: { ok?: string; error?: string }) => {
  const q = msg?.ok ? `?ok=${encodeURIComponent(msg.ok)}` : msg?.error ? `?error=${encodeURIComponent(msg.error)}` : "";
  redirect(`/p/${projectId}/members${q}`);
};

// A member edits their own roles; an instructor edits anyone's (RLS decides which applies).
export async function setRoles(formData: FormData) {
  const projectId = String(formData.get("project_id"));
  const roles = Array.from(formData.getAll("roles")).map(String).filter(Boolean);
  if (roles.length === 0) back(projectId, { error: "Keep at least one role." });
  const supabase = await createClient();
  const { data, error } = await supabase.from("project_members").update({ roles }).eq("project_id", projectId).eq("user_id", String(formData.get("user_id"))).select("user_id");
  if (error) back(projectId, { error: error.message });
  if (!data?.length) back(projectId, { error: "Nothing changed: you can only edit your own roles unless you're an instructor." });
  revalidatePath(`/p/${projectId}/members`);
  back(projectId, { ok: "Roles updated." });
}

export async function removeMember(formData: FormData) {
  const projectId = String(formData.get("project_id"));
  const supabase = await createClient();
  const { error } = await supabase.from("project_members").delete().eq("project_id", projectId).eq("user_id", String(formData.get("user_id")));
  if (error) back(projectId, { error: error.message });
  revalidatePath(`/p/${projectId}/members`);
  back(projectId, { ok: "Removed." });
}
