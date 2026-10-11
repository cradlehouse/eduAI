import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Landing } from "@/components/Landing";

export const metadata = {
  title: "Imaje · A film school in the browser",
  description: "Students write the script, design the cast and the world, plan every shot, choose the takes and cut the film. Join the alpha for schools and youth programmes.",
};

// Signed out: the public front page. Signed in: my_landing() routes to the cohort (student, or
// instructor with one), /home, or /welcome.
export default async function Root() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return <Landing />;
  const { data: landing, error } = await supabase.rpc("my_landing");
  if (error) throw new Error(`my_landing failed: ${error.message}`);
  redirect(landing ?? "/welcome");
}
