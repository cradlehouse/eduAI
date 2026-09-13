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

// Admin-only: switch plan. No payment is taken yet — billing is not connected; this records the choice
// and the date so the Organisation screen and the allowance are right.
export async function setPlan(formData: FormData) {
  const org = await getAdminOrg();
  if (!org) redirect("/");
  const plan = String(formData.get("plan") ?? "");
  const supabase = await createClient();
  const { data: p } = await supabase.from("plans").select("key, name").eq("key", plan).maybeSingle();
  if (!p) redirect(`/org?error=${encodeURIComponent("Unknown plan.")}`);
  const { error } = await supabase.from("orgs").update({ plan: p.key, plan_started_on: new Date().toISOString().slice(0, 10) }).eq("id", org.id);
  if (error) redirect(`/org?error=${encodeURIComponent(error.message)}`);
  revalidatePath("/org");
  redirect(`/org?ok=${encodeURIComponent(`You're on the ${p.name} plan. We'll invoice at the new rate from today; card payments are coming.`)}`);
}

export async function setBilling(formData: FormData) {
  const org = await getAdminOrg();
  if (!org) redirect("/");
  const supabase = await createClient();
  const email = String(formData.get("billing_email") ?? "").trim() || null;
  const overage = formData.get("overage_allowed") === "on";
  const { error } = await supabase.from("orgs").update({ billing_email: email, overage_allowed: overage }).eq("id", org.id);
  if (error) redirect(`/org?error=${encodeURIComponent(error.message)}`);
  revalidatePath("/org");
  redirect(`/org?ok=${encodeURIComponent("Billing details saved.")}`);
}
