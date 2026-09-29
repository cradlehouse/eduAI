import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { Json } from "@/lib/db/types";

// Which registry route each job uses. Open-weight routes first (they can move to our own GPUs); the
// older closed routes only when a school hasn't enabled the open ones.
export const ROUTES = {
  image: ["qwen-image@fal"],
  edit: ["qwen-edit@fal", "flux-2-pro-edit@fal"],
  angle: ["qwen-angles@fal"],
  voice: ["kokoro@fal"],
  room: ["stable-audio-open@fal", "stable-audio-2.5@fal"],
  music: ["stable-audio-open@fal", "stable-audio-2.5@fal"],
  clip: ["ltx-2.5-fast-i2v@fal"],
  clipFinish: ["ltx-2.5-pro-i2v@fal"],
} as const;
export type RouteKey = keyof typeof ROUTES;

export async function pickRoute(projectId: string, key: RouteKey) {
  const supabase = await createClient();
  for (const lane of ["explore", "control", "finish"] as const) {
    const { data } = await supabase.rpc("model_options", { p_project: projectId, p_lane: lane });
    for (const slug of ROUTES[key]) {
      const o = (data ?? []).find((x) => x.profile_slug === slug && x.allowed);
      if (o) return { profileId: o.profile_id, lane, slug };
    }
  }
  return null;
}

// Tokens a job would cost, for the price on the button.
export async function priceOf(projectId: string, key: RouteKey, inputs: Record<string, Json>) {
  const r = await pickRoute(projectId, key);
  if (!r) return null;
  const supabase = await createClient();
  const { data } = await supabase.rpc("estimate_tokens", { p_profile: r.profileId, p_inputs: inputs });
  return data ?? null;
}
