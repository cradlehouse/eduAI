"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { storeUpload } from "@/lib/assets/store";
import type { Database } from "@/lib/db/types";

type BibleKind = Database["public"]["Enums"]["bible_kind"];
type Lane = Database["public"]["Enums"]["lane"];
type Distribution = Database["public"]["Enums"]["distribution_scope"];
type EntryPatch = Database["public"]["Tables"]["bible_entries"]["Update"];

const KINDS: BibleKind[] = ["character", "location", "prop", "style", "voice"];
const LANES: Lane[] = ["explore", "control", "finish", "voice_likeness"];
const back = (projectId: string, entryId?: string, msg?: { ok?: string; error?: string }) => {
  const q = msg?.ok ? `?ok=${encodeURIComponent(msg.ok)}` : msg?.error ? `?error=${encodeURIComponent(msg.error)}` : "";
  redirect(`/p/${projectId}/bible${entryId ? `/${entryId}` : ""}${q}`);
};

export async function createEntry(formData: FormData) {
  const projectId = String(formData.get("project_id"));
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: project } = await supabase.from("projects").select("org_id").eq("id", projectId).maybeSingle();
  if (!project) back(projectId, undefined, { error: "Project not found." });

  const kind = String(formData.get("kind")) as BibleKind;
  const name = String(formData.get("name") ?? "").trim();
  const likeness = String(formData.get("likeness_of") ?? "").trim() || null;
  if (!KINDS.includes(kind) || !name) back(projectId, undefined, { error: "Kind and name are required." });

  const { data: row, error } = await supabase.from("bible_entries").insert({
    org_id: project!.org_id, project_id: projectId, kind, name,
    description: String(formData.get("description") ?? "").trim(),
    likeness_of: likeness, requires_consent: !!likeness || formData.get("requires_consent") === "on",
    created_by: user!.id,
  }).select("id").single();
  if (error) back(projectId, undefined, { error: error.message });
  revalidatePath(`/p/${projectId}/bible`);
  back(projectId, row!.id);
}

export async function updateEntry(formData: FormData) {
  const projectId = String(formData.get("project_id"));
  const entryId = String(formData.get("entry_id"));
  const supabase = await createClient();
  const likeness = String(formData.get("likeness_of") ?? "").trim() || null;
  const patch: EntryPatch = {
    name: String(formData.get("name") ?? "").trim(),
    description: String(formData.get("description") ?? "").trim(),
    likeness_of: likeness,
    requires_consent: !!likeness || formData.get("requires_consent") === "on",
  };
  const file = formData.get("reference") as File | null;
  if (file && file.size > 0) {
    const r = await storeUpload(file, projectId, "image");
    if ("error" in r) back(projectId, entryId, { error: r.error });
    patch.reference_asset_id = (r as { id: string }).id;
  }
  const { error } = await supabase.from("bible_entries").update(patch).eq("id", entryId);
  if (error) back(projectId, entryId, { error: error.message });
  revalidatePath(`/p/${projectId}/bible`);
  back(projectId, entryId, { ok: "Saved." });
}

export async function deleteEntry(formData: FormData) {
  const projectId = String(formData.get("project_id"));
  const supabase = await createClient();
  const { error } = await supabase.from("bible_entries").delete().eq("id", String(formData.get("entry_id")));
  if (error) back(projectId, undefined, { error: error.message });
  revalidatePath(`/p/${projectId}/bible`);
  back(projectId, undefined, { ok: "Entry deleted." });
}

// A release is specific: subject, rights holder, guardian flag, minor flag, permitted lanes,
// distribution scope, expiry, and the signed document. Uploading the signed document marks it signed;
// without it the release is pending. Revocation is instructor/admin-only (RLS) and lives on the entry page.
export async function addRelease(formData: FormData) {
  const projectId = String(formData.get("project_id"));
  const entryId = String(formData.get("entry_id"));
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: project } = await supabase.from("projects").select("org_id").eq("id", projectId).maybeSingle();
  if (!project) back(projectId, entryId, { error: "Project not found." });

  const lanes = LANES.filter((l) => formData.get(`lane_${l}`) === "on");
  if (lanes.length === 0) back(projectId, entryId, { error: "Pick at least one permitted lane." });
  const subjectIsMinor = formData.get("subject_is_minor") === "on";
  const isGuardian = formData.get("is_guardian") === "on";
  if (subjectIsMinor && !isGuardian) back(projectId, entryId, { error: "A minor's release must be signed by a guardian." });

  let fileAssetId: string | null = null;
  const file = formData.get("signed_file") as File | null;
  if (file && file.size > 0) {
    const r = await storeUpload(file, projectId, "document");
    if ("error" in r) back(projectId, entryId, { error: r.error });
    fileAssetId = (r as { id: string }).id;
  }
  let sourceAssetId: string | null = null;
  const src = formData.get("source_file") as File | null;
  if (src && src.size > 0) {
    const kind = src.type.startsWith("audio/") ? "audio" : "image";
    const r = await storeUpload(src, projectId, kind);
    if ("error" in r) back(projectId, entryId, { error: r.error });
    sourceAssetId = (r as { id: string }).id;
  }
  const expires = String(formData.get("expires_at") ?? "");

  const { error } = await supabase.from("consent_releases").insert({
    org_id: project!.org_id, project_id: projectId, bible_entry_id: entryId,
    subject_name: String(formData.get("subject_name") ?? "").trim(),
    rights_holder_name: String(formData.get("rights_holder_name") ?? "").trim(),
    signer_email: String(formData.get("signer_email") ?? "").trim() || null,
    is_guardian: isGuardian, subject_is_minor: subjectIsMinor,
    permitted_lanes: lanes,
    distribution: String(formData.get("distribution") ?? "cohort") as Distribution,
    expires_at: expires ? new Date(expires).toISOString() : null,
    state: fileAssetId ? "signed" : "pending",
    signed_at: fileAssetId ? new Date().toISOString() : null,
    file_asset_id: fileAssetId, source_asset_id: sourceAssetId, created_by: user!.id,
  });
  if (error) back(projectId, entryId, { error: error.message });
  revalidatePath(`/p/${projectId}/bible`);
  back(projectId, entryId, { ok: fileAssetId ? "Release recorded as signed." : "Release recorded as pending; upload the signed document to activate it." });
}

export async function revokeRelease(formData: FormData) {
  const projectId = String(formData.get("project_id"));
  const entryId = String(formData.get("entry_id"));
  const supabase = await createClient();
  const { error } = await supabase.from("consent_releases").update({
    state: "revoked", revoked_at: new Date().toISOString(),
    revoked_reason: String(formData.get("reason") ?? "").trim() || "revoked",
  }).eq("id", String(formData.get("release_id")));
  if (error) back(projectId, entryId, { error: error.message });
  revalidatePath(`/p/${projectId}/bible`);
  back(projectId, entryId, { ok: "Release revoked. New generation with this entry is blocked." });
}
