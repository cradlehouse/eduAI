"use server";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { verifyTurnstile } from "@/lib/turnstile";

export type AlphaState = { ok: boolean; message: string } | null;

const ROLES = new Set(["programme_lead", "instructor", "school_leader", "parent", "other"]);

// The landing page's alpha sign-up. Saved through public.alpha_signup() (migration 0136), which checks
// the fields, takes each email once and refuses floods; nobody can read the list through the API.
export async function joinAlpha(_prev: AlphaState, form: FormData): Promise<AlphaState> {
  // A field people never see: anything in it is a bot.
  if (String(form.get("website") ?? "").trim()) return { ok: true, message: "Thanks. You're on the list." };
  const name = String(form.get("name") ?? "").trim();
  const email = String(form.get("email") ?? "").trim();
  const role = String(form.get("role") ?? "");
  if (!name) return { ok: false, message: "Add your name." };
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return { ok: false, message: "That email doesn't look right." };
  if (!ROLES.has(role)) return { ok: false, message: "Choose what you do." };
  if (form.get("adult") !== "on") return { ok: false, message: "The alpha is for adults: tick to confirm you're 18 or over." };
  const ip = (await headers()).get("cf-connecting-ip");
  if (!(await verifyTurnstile(String(form.get("cf-turnstile-response") ?? ""), ip))) return { ok: false, message: "We couldn't confirm you're a person. Wait for the check above the button, then try again." };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("alpha_signup", {
    p_name: name.slice(0, 120), p_email: email.slice(0, 200), p_organisation: String(form.get("organisation") ?? "").slice(0, 200),
    p_role: role, p_students: String(form.get("students") ?? "").slice(0, 40), p_note: String(form.get("note") ?? "").slice(0, 1000), p_adult: true,
  });
  if (error) return { ok: false, message: error.message.includes("busy") ? "Lots of sign-ups right now. Try again in a few minutes." : "That didn't go through. Try again, or email us." };
  return data === "already"
    ? { ok: true, message: "You're already on the list. We'll be in touch." }
    : { ok: true, message: "Thanks. You're on the list; we'll email you about the alpha." };
}
