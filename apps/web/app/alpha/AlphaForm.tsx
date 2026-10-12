"use client";
import Script from "next/script";
import { useActionState } from "react";
import { joinAlpha, type AlphaState } from "./actions";

const field = "input w-full text-[14px] py-2";
// Cloudflare Turnstile, when its site key is set (see lib/turnstile.ts); otherwise the honeypot alone.
const SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

// The alpha sign-up form on the landing page. Plain fields, one honest line about what we do with them.
export function AlphaForm() {
  const [state, action, pending] = useActionState<AlphaState, FormData>(joinAlpha, null);
  if (state?.ok) return <p className="rounded-[10px] border border-gold/40 bg-gold-wash p-4 text-[15px] text-ink" role="status">{state.message}</p>;
  return (
    <form action={action} className="grid gap-3 sm:grid-cols-2">
      <label className="label flex flex-col gap-1">Name<input name="name" required autoComplete="name" className={field} /></label>
      <label className="label flex flex-col gap-1">Email<input name="email" type="email" required autoComplete="email" className={field} /></label>
      <label className="label flex flex-col gap-1">School or programme<input name="organisation" autoComplete="organization" className={field} placeholder="optional" /></label>
      <label className="label flex flex-col gap-1">What you do
        <select name="role" required defaultValue="" className={field}>
          <option value="" disabled>Choose one</option>
          <option value="programme_lead">I run a programme or department</option>
          <option value="instructor">I teach film, media or art</option>
          <option value="school_leader">I lead a school</option>
          <option value="parent">I&apos;m a parent or guardian</option>
          <option value="other">Something else</option>
        </select>
      </label>
      <label className="label flex flex-col gap-1">Roughly how many students?<input name="students" className={field} placeholder="optional, e.g. 20–30" /></label>
      <label className="label flex flex-col gap-1">Anything we should know?<input name="note" className={field} placeholder="optional" /></label>
      {/* Hidden from people; bots fill it in. */}
      <input name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" className="absolute left-[-9999px] h-0 w-0 opacity-0" />
      <label className="flex items-start gap-2 text-[13px] text-dim sm:col-span-2">
        <input type="checkbox" name="adult" required className="mt-0.5" />
        <span>I&apos;m 18 or over. Imaje may email me about the alpha; my details aren&apos;t used for anything else or shared. <a href="/privacy" target="_blank" className="underline hover:text-ink">Privacy</a></span>
      </label>
      {SITE_KEY && <>
        <Script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer />
        <div className="cf-turnstile sm:col-span-2" data-sitekey={SITE_KEY} data-theme="dark" />
      </>}
      <div className="flex flex-wrap items-center gap-3 sm:col-span-2">
        <button disabled={pending} className="btn-primary px-5 py-2.5 text-[14px]">{pending ? "Sending…" : "Join the alpha"}</button>
        {state && !state.ok && <span className="text-[13px] text-drift" role="alert">{state.message}</span>}
      </div>
    </form>
  );
}
