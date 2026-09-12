"use server";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function saveDisplayName(formData: FormData) {
  const name = String(formData.get("display_name") ?? "").trim().slice(0, 80);
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data } = await supabase.from("users").update({ display_name: name || null }).eq("id", user.id).select("id");
  if (!data?.length) throw new Error("Nothing changed: you can only edit your own name.");
  redirect("/account?saved=name");
}
