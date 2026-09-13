import { redirect } from "next/navigation";
import { getAdminOrg } from "@/lib/auth/org";
import { getNav } from "@/lib/auth/nav";
import { Shell } from "@/components/Shell";
import { NavItem } from "@/components/NavItem";

const SECTIONS = { "": "Overview", people: "People", cohorts: "Cohorts" };

export default async function OrgLayout({ children }: { children: React.ReactNode }) {
  const [org, nav] = await Promise.all([getAdminOrg(), getNav()]);
  if (!org || !nav) redirect("/");
  return (
    <Shell nav={nav} crumbs={[{ label: org.name, href: "/home", image: nav.org?.mark_url }, { label: "Organisation", href: "/org" }]} base="/org" sections={SECTIONS}
      sidebarTitle="Organisation"
      sidebar={<>
        <NavItem href="/org" exact icon="Building2">Overview</NavItem>
        <NavItem href="/org/cohorts" icon="GraduationCap">Cohorts</NavItem>
        <NavItem href="/org/people" icon="Users">People</NavItem>
      </>}>
      {children}
    </Shell>
  );
}
