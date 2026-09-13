"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

// While any job on this project is queued or running, refresh the page every few seconds so the take
// appears when the orchestrator settles it. (Polling now; Supabase Realtime can replace it later.)
export function JobWatcher({ active }: { active: boolean }) {
  const router = useRouter();
  useEffect(() => {
    if (!active) return;
    const t = setInterval(() => router.refresh(), 4000);
    return () => clearInterval(t);
  }, [active, router]);
  return null;
}
