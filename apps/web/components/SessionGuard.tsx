"use client";
import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

// Next's client router reuses the last rendered tree on Back/forward, so a page rendered for one
// account can reappear after the session changed in another window of the same browser. Whenever
// this tab is shown again (Back, tab switch, focus) or the auth state changes, compare the cookie
// session's user with the one this page was rendered for and hard-reload if they differ.
export function SessionGuard({ userId }: { userId: string }) {
  useEffect(() => {
    const supabase = createClient();
    let checking = false;
    const check = async () => {
      if (checking) return;
      checking = true;
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if ((session?.user.id ?? null) !== userId) window.location.reload();
      } finally { checking = false; }
    };
    const onShow = () => { void check(); };
    const onVis = () => { if (document.visibilityState === "visible") void check(); };
    window.addEventListener("pageshow", onShow);
    window.addEventListener("focus", check);
    document.addEventListener("visibilitychange", onVis);
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT" || (session && session.user.id !== userId)) window.location.reload();
    });
    return () => {
      window.removeEventListener("pageshow", onShow);
      window.removeEventListener("focus", check);
      document.removeEventListener("visibilitychange", onVis);
      sub.subscription.unsubscribe();
    };
  }, [userId]);
  return null;
}
