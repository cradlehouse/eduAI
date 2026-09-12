"use client";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { safeNext } from "@/lib/auth/safe-next";

export function LoginForm({ next, initialEmail }: { next: string; initialEmail: string }) {
  const [email, setEmail] = useState(initialEmail);
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [message, setMessage] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setState("sending");
    const supabase = createClient();
    const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(safeNext(next))}`;
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim().toLowerCase(),
      options: { emailRedirectTo: redirectTo, shouldCreateUser: true },
    });
    if (error) {
      setState("error");
      setMessage(error.message);
      return;
    }
    setState("sent");
  }

  if (state === "sent") {
    return (
      <p className="text-sm">
        Check <strong>{email}</strong> for a sign-in link. Open it on this device.
      </p>
    );
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-3">
      <label className="text-sm font-medium" htmlFor="email">Email</label>
      <input
        id="email"
        type="email"
        required
        autoComplete="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="rounded border border-ink/20 bg-white px-3 py-2 text-ink dark:border-paper/20"
      />
      <button
        type="submit"
        disabled={state === "sending"}
        className="rounded bg-ink px-3 py-2 font-medium text-paper disabled:opacity-50 dark:bg-paper dark:text-ink"
      >
        {state === "sending" ? "Sending…" : "Send sign-in link"}
      </button>
      {state === "error" && <p className="text-sm text-danger">{message}</p>}
    </form>
  );
}
