"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

export type CrumbSeg = { label: string; href?: string; image?: string | null; siblings?: { id: string; label: string; href: string }[] };

// Header breadcrumb = the scope switcher. A segment with siblings is a dropdown; the last segment is
// the current page and is never a link (NN/g). Clicking a parent segment is the way back up.
// `sections` maps the trailing path segment under `base` to the current page's label.
export function Crumb({ segs: given, base, sections }: { segs: CrumbSeg[]; base?: string; sections?: Record<string, string> }) {
  const router = useRouter();
  const path = usePathname();
  let segs = given;
  if (base && sections) {
    const rest = path.startsWith(base) ? path.slice(base.length).replace(/^\//, "").split("/")[0] ?? "" : "";
    const label = sections[rest] ?? sections[""] ?? "";
    if (label) segs = [...given, { label }];
  }
  return (
    <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-1 text-sm">
      {segs.map((s, i) => {
        const last = i === segs.length - 1;
        return (
          <span key={i} className="flex min-w-0 items-center gap-1">
            {i > 0 && <span className="text-dim">›</span>}
            {s.siblings && s.siblings.length > 1 ? (
              <select aria-label={`Switch ${s.label}`} value={s.href ?? ""} onChange={(e) => router.push(e.target.value)}
                      className="display max-w-[220px] truncate rounded-full border border-glass-edge bg-card px-2.5 py-0.5 text-xs">
                {s.siblings.map((o) => <option key={o.id} value={o.href}>{o.label}</option>)}
              </select>
            ) : last || !s.href ? (
              <span className={`flex min-w-0 items-center gap-1.5 truncate ${last ? "text-ink" : "text-dim"}`}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {s.image && <img src={s.image} alt="" className="h-5 w-5 shrink-0 object-contain" />}{s.label}</span>
            ) : (
              <Link href={s.href} className="truncate rounded-full border border-glass-edge bg-card px-2.5 py-0.5 text-xs hover:bg-glass">{s.label}</Link>
            )}
          </span>
        );
      })}
    </nav>
  );
}
