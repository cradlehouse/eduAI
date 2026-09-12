import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

// "/" only routes: my_landing() → the cohort (student, or instructor with one), /home, or /welcome.
export default async function Root() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: landing, error } = await supabase.rpc("my_landing");
  if (error) throw new Error(`my_landing failed: ${error.message}`);
  redirect(landing ?? "/welcome");
}
