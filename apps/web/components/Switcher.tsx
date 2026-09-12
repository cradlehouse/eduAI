"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";

// Section header: the current name is always a link to that section's root; with more than one
// option it is also a switcher. hrefBase is a string because server components cannot pass functions.
export function Switcher({ label, current, options, hrefBase }: { label: string; current: { id: string; name: string } | null; options: { id: string; name: string }[]; hrefBase: string }) {
  const router = useRouter();
  return (
    <div className="mb-1 flex items-baseline justify-between gap-2">
      <span className="label">{label}</span>
      {options.length > 1 ? (
        <select aria-label={`Switch ${label.toLowerCase()}`} value={current?.id ?? ""} onChange={(e) => router.push(`${hrefBase}${e.target.value}`)}
                className="display max-w-[140px] truncate rounded-full border border-line bg-card px-2 py-0.5 text-xs">
          {options.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
        </select>
      ) : current ? (
        <Link href={`${hrefBase}${current.id}`} className="display truncate text-xs hover:underline">{current.name}</Link>
      ) : null}
    </div>
  );
}
