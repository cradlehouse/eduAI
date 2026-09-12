import Link from "next/link";
import { redirect } from "next/navigation";
import { getAdminOrg } from "@/lib/auth/org";

const NAV = [
  { href: "/org", label: "Organisation" },
  { href: "/org/people", label: "People" },
  { href: "/org/cohorts", label: "Cohorts" },
  { href: "/org/courses", label: "Courses", soon: true },
  { href: "/org/models", label: "Models", soon: true },
  { href: "/org/credentials", label: "Credentials", soon: true },
];

export default async function OrgLayout({ children }: { children: React.ReactNode }) {
  const org = await getAdminOrg();
  if (!org) redirect("/");
  return (
    <div className="flex min-h-screen">
      <aside className="w-56 shrink-0 panel m-3 p-4">
        <div className="mb-6">
          <div className="label">Admin</div>
          <div className="font-semibold">{org.name}</div>
        </div>
        <nav className="flex flex-col gap-1 text-sm">
          {NAV.map((n) =>
            n.soon ? (
              <span key={n.href} className="rounded px-2 py-1 opacity-40">{n.label} <span className="text-xs">soon</span></span>
            ) : (
              <Link key={n.href} href={n.href} className="rounded-full px-3 py-1 hover:bg-card">{n.label}</Link>
            ),
          )}
        </nav>
      </aside>
      <main className="flex-1 p-8">{children}</main>
    </div>
  );
}
