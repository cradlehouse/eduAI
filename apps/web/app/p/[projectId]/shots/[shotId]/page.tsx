import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

// Shots live under their scene now (Scene → Shot). Old links still land.
export default async function ShotRedirect({ params }: { params: Promise<{ projectId: string; shotId: string }> }) {
  const { projectId, shotId } = await params;
  const supabase = await createClient();
  const { data } = await supabase.from("shots").select("scene_id").eq("id", shotId).maybeSingle();
  redirect(data ? `/p/${projectId}/scenes/${data.scene_id}/shots/${shotId}` : `/p/${projectId}/scenes`);
}
