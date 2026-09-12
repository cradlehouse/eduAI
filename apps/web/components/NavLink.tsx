"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

// Highlights the item for the page you are on. `exact` for section roots so /c/x doesn't light up on /c/x/projects.
export function NavLink({ href, exact, children }: { href: string; exact?: boolean; children: React.ReactNode }) {
  const path = usePathname();
  const active = exact ? path === href : path === href || path.startsWith(href + "/");
  return (
    <Link href={href} className={`block rounded-full px-3 py-1 text-sm ${active ? "bg-ink text-paper" : "hover:bg-card"}`}>
      {children}
    </Link>
  );
}
