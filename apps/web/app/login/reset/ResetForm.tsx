"use client";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function ResetForm({ initialEmail }: { initialEmail: string }) {
  const [email, setEmail] = useState(initialEmail);
  const [state, setState] = useState<"idle" | "busy" | "sent" | "error">("idle");
  const [message, setMessage] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setState("busy");
    const supabase = createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
      redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent("/account?set=password")}`,
    });
    if (error) { setState("error"); setMessage(error.message); return; }
    setState("sent");
  }

  if (state === "sent") return <p className="text-sm">Check <strong>{email}</strong> for the link.</p>;
  return (
    <form onSubmit={submit} className="flex flex-col gap-3">
      <label className="text-sm font-medium" htmlFor="email">Email</label>
      <input id="email" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className="input" />
      <button type="submit" disabled={state === "busy"} className="btn-primary">{state === "busy" ? "…" : "Send reset link"}</button>
      {state === "error" && <p className="text-sm text-drift">{message}</p>}
      <a href="/login" className="text-xs text-dim underline">Back to sign in</a>
    </form>
  );
}
