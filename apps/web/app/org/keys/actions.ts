"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getAdminOrg } from "@/lib/auth/org";

export async function addKey(formData: FormData) {
  const org = await getAdminOrg();
  if (!org) redirect("/");
  const supabase = await createClient();
  const { error } = await supabase.rpc("add_org_credential", {
    p_org: org.id, p_provider: String(formData.get("provider")), p_secret: String(formData.get("secret") ?? ""), p_label: String(formData.get("label") ?? ""),
  });
  if (error) redirect(`/org/keys?error=${encodeURIComponent(error.message)}`);
  revalidatePath("/org/keys");
  redirect(`/org/keys?ok=${encodeURIComponent("Key added. Routes on this vendor now run on your account.")}`);
}

export async function revokeKey(formData: FormData) {
  const org = await getAdminOrg();
  if (!org) redirect("/");
  const supabase = await createClient();
  const { error } = await supabase.rpc("revoke_org_credential", { p_id: String(formData.get("id")) });
  if (error) redirect(`/org/keys?error=${encodeURIComponent(error.message)}`);
  revalidatePath("/org/keys");
  redirect(`/org/keys?ok=${encodeURIComponent("Key revoked. Routes fall back to the platform key.")}`);
}
