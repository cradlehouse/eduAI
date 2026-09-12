"use client";
import { useRouter } from "next/navigation";

// A section header that is also a switcher when there is more than one thing to switch to.
// hrefBase, not a function: server components cannot pass functions to client components.
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
      ) : (
        <span className="display truncate text-xs">{current?.name ?? ""}</span>
      )}
    </div>
  );
}
