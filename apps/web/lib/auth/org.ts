import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/db/types";

export type MemberRole = Database["public"]["Enums"]["member_role"];
export type AdminOrg = { id: string; name: string; slug: string; content_tier: "M" | "A"; has_minors: boolean; tokens_per_dollar: number; role: MemberRole };

// The org the signed-in user administers. First admin/owner membership for now; a switcher comes
// when someone actually has two orgs. Returns null when they administer nothing.
export async function getAdminOrg(): Promise<AdminOrg | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("memberships")
    .select("role, orgs(id, name, slug, content_tier, has_minors, tokens_per_dollar)")
    .in("role", ["admin", "owner"])
    .order("created_at")
    .limit(1)
    .maybeSingle();
  if (!data?.orgs) return null;
  return { ...data.orgs, role: data.role };
}
