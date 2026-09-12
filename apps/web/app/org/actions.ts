"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getAdminOrg } from "@/lib/auth/org";

// Admin-only: the tokens↔money rate. Students and instructors never see money.
export async function setTokenRate(formData: FormData) {
  const org = await getAdminOrg();
  if (!org) redirect("/");
  const tokens = Number(formData.get("tokens_per_dollar"));
  if (!Number.isInteger(tokens) || tokens <= 0) redirect(`/org?error=${encodeURIComponent("Tokens per dollar must be a positive whole number.")}`);
  const supabase = await createClient();
  const { error } = await supabase.from("orgs").update({ tokens_per_dollar: tokens }).eq("id", org.id);
  if (error) redirect(`/org?error=${encodeURIComponent(error.message)}`);
  revalidatePath("/org");
  redirect(`/org?ok=${encodeURIComponent(`Rate set: $1 = ${tokens.toLocaleString()} tokens.`)}`);
}
