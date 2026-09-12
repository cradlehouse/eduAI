import "server-only";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/db/types";

type AssetKind = Database["public"]["Enums"]["asset_kind"];

const MAX_BYTES = 25 * 1024 * 1024;
const ALLOWED: Record<AssetKind, RegExp> = {
  image: /^image\/(png|jpeg|webp|gif)$/,
  document: /^(application\/pdf|image\/(png|jpeg|webp))$/,
  audio: /^audio\//,
  video: /^video\//,
  render: /^video\//,
};

function extOf(file: File): string {
  const m = file.name.match(/\.([a-z0-9]{1,5})$/i);
  if (m) return m[1].toLowerCase();
  return file.type.split("/")[1]?.replace("jpeg", "jpg") ?? "bin";
}

async function sha256Hex(buf: ArrayBuffer): Promise<string> {
  const d = await crypto.subtle.digest("SHA-256", buf);
  return [...new Uint8Array(d)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

// Content-addressed upload: <org>/<sha[0:2]>/<sha>.<ext>. Same bytes ⇒ same key ⇒ one assets row.
// The R2 write needs no credentials (Worker binding); the assets row is inserted as the user (RLS:
// project member, source = uploaded, created_by = me). Returns the asset id.
export async function storeUpload(file: File, projectId: string, kind: AssetKind): Promise<{ id: string } | { error: string }> {
  if (file.size === 0) return { error: "Empty file." };
  if (file.size > MAX_BYTES) return { error: `File is larger than ${MAX_BYTES / 1024 / 1024} MB.` };
  if (!ALLOWED[kind].test(file.type)) return { error: `Unsupported file type ${file.type || "(unknown)"} for ${kind}.` };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };
  const { data: project } = await supabase.from("projects").select("org_id").eq("id", projectId).maybeSingle();
  if (!project) return { error: "Project not found." };

  const buf = await file.arrayBuffer();
  const sha = await sha256Hex(buf);
  const key = `${project.org_id}/${sha.slice(0, 2)}/${sha}.${extOf(file)}`;

  const { data: existing } = await supabase.from("assets").select("id").eq("org_id", project.org_id).eq("sha256", sha).maybeSingle();
  if (existing) return { id: existing.id };

  const { env } = getCloudflareContext();
  const head = await env.ASSETS_BUCKET.head(key);
  if (!head) await env.ASSETS_BUCKET.put(key, buf, { httpMetadata: { contentType: file.type }, sha256: sha });

  const { data: row, error } = await supabase.from("assets").insert({
    org_id: project.org_id, project_id: projectId, kind, source: "uploaded", r2_key: key, sha256: sha,
    mime: file.type, bytes: file.size, created_by: user.id,
    provenance: { source: "upload", original_name: file.name, uploaded_by: user.id },
  }).select("id").single();
  if (error) return { error: error.message };
  return { id: row.id };
}
