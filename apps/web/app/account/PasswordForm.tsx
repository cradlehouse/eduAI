"use client";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function PasswordForm() {
  const [pw, setPw] = useState("");
  const [again, setAgain] = useState("");
  const [state, setState] = useState<"idle" | "busy" | "done" | "error">("idle");
  const [message, setMessage] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (pw !== again) { setState("error"); setMessage("The two passwords don't match."); return; }
    setState("busy");
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password: pw, data: { has_password: true } });
    if (error) { setState("error"); setMessage(error.message); return; }
    setPw(""); setAgain(""); setState("done");
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-2">
      <input type="password" required minLength={8} autoComplete="new-password" placeholder="New password (8+ characters)" value={pw} onChange={(e) => setPw(e.target.value)} className="input" />
      <input type="password" required minLength={8} autoComplete="new-password" placeholder="Again" value={again} onChange={(e) => setAgain(e.target.value)} className="input" />
      <div className="flex items-center gap-3">
        <button type="submit" disabled={state === "busy"} className="btn-primary">{state === "busy" ? "…" : "Save password"}</button>
        {state === "done" && <span className="text-xs text-gold">Saved. Use it next time you sign in.</span>}
        {state === "error" && <span className="text-xs text-drift">{message}</span>}
      </div>
    </form>
  );
}
