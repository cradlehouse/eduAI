import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

// "/" is only a router: send the user where their role says.
export default async function Home() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: landing, error } = await supabase.rpc("my_landing");
  if (error) throw new Error(`my_landing failed: ${error.message}`);
  redirect(landing ?? "/welcome");
}
