"use client";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { safeNext } from "@/lib/auth/safe-next";

type Mode = "password" | "link";

// Password first (sessions persist, no email round-trip), Google when configured, and the emailed
// link kept for invites and for anyone who never set a password.
export function LoginForm({ next, initialEmail, google, initialMode }: { next: string; initialEmail: string; google: boolean; initialMode: Mode }) {
  const [mode, setMode] = useState<Mode>(initialMode);
  const [email, setEmail] = useState(initialEmail);
  const [password, setPassword] = useState("");
  const [state, setState] = useState<"idle" | "busy" | "sent" | "error">("idle");
  const [message, setMessage] = useState("");
  const callback = () => `${window.location.origin}/auth/callback?next=${encodeURIComponent(safeNext(next))}`;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setState("busy");
    const supabase = createClient();
    const addr = email.trim().toLowerCase();
    if (mode === "password") {
      const { error } = await supabase.auth.signInWithPassword({ email: addr, password });
      if (error) { setState("error"); setMessage(error.message === "Invalid login credentials" ? "Wrong email or password." : error.message); return; }
      window.location.assign(safeNext(next));
      return;
    }
    const { error } = await supabase.auth.signInWithOtp({ email: addr, options: { emailRedirectTo: callback(), shouldCreateUser: true } });
    if (error) { setState("error"); setMessage(error.message); return; }
    setState("sent");
  }

  async function withGoogle() {
    setState("busy");
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo: callback() } });
    if (error) { setState("error"); setMessage(error.message); }
  }

  if (state === "sent") {
    return <p className="text-sm">Check <strong>{email}</strong> for a sign-in link. It works on any device.</p>;
  }

  return (
    <div className="flex flex-col gap-4">
      {google && (
        <>
          <button type="button" onClick={withGoogle} disabled={state === "busy"} className="btn flex items-center justify-center gap-2 py-2">
            <svg width="16" height="16" viewBox="0 0 48 48" aria-hidden="true"><path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.5 5.4 2.6 13.3l7.9 6.1C12.4 13.6 17.7 9.5 24 9.5z"/><path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.2 5.5-4.7 7.2l7.6 5.9c4.4-4.1 6.9-10.1 6.9-17.6z"/><path fill="#FBBC05" d="M10.5 28.6c-.5-1.4-.8-3-.8-4.6s.3-3.2.8-4.6l-7.9-6.1C1 16.4 0 20.1 0 24s1 7.6 2.6 10.7l7.9-6.1z"/><path fill="#34A853" d="M24 48c6.3 0 11.7-2.1 15.6-5.7l-7.6-5.9c-2.1 1.4-4.8 2.3-8 2.3-6.3 0-11.6-4.1-13.5-9.8l-7.9 6.1C6.5 42.6 14.6 48 24 48z"/></svg>
            Continue with Google
          </button>
          <div className="flex items-center gap-3 text-xs text-muted"><span className="h-px flex-1 bg-line" />or<span className="h-px flex-1 bg-line" /></div>
        </>
      )}
      <form onSubmit={submit} className="flex flex-col gap-3">
        <label className="text-sm font-medium" htmlFor="email">Email</label>
        <input id="email" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className="input" />
        {mode === "password" && (
          <>
            <label className="text-sm font-medium" htmlFor="password">Password</label>
            <input id="password" type="password" required autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} className="input" />
          </>
        )}
        <button type="submit" disabled={state === "busy"} className="btn-primary">
          {state === "busy" ? "…" : mode === "password" ? "Sign in" : "Email me a sign-in link"}
        </button>
        {state === "error" && <p className="text-sm text-danger">{message}</p>}
      </form>
      <div className="flex flex-wrap justify-between gap-2 text-xs text-muted">
        {mode === "password" ? (
          <>
            <button type="button" className="underline" onClick={() => { setMode("link"); setState("idle"); }}>Email me a link instead</button>
            <a className="underline" href={`/login/reset?email=${encodeURIComponent(email)}`}>Forgot password?</a>
          </>
        ) : (
          <button type="button" className="underline" onClick={() => { setMode("password"); setState("idle"); }}>Sign in with a password</button>
        )}
      </div>
    </div>
  );
}
