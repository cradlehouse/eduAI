import { redirect } from "next/navigation";
import { getAdminOrg } from "@/lib/auth/org";
import { getNav } from "@/lib/auth/nav";
import { Shell } from "@/components/Shell";
import { NavItem, NavSoon } from "@/components/NavItem";

const SECTIONS = { "": "Overview", people: "People", cohorts: "Cohorts" };

export default async function OrgLayout({ children }: { children: React.ReactNode }) {
  const [org, nav] = await Promise.all([getAdminOrg(), getNav()]);
  if (!org || !nav) redirect("/");
  return (
    <Shell nav={nav} crumbs={[{ label: org.name, href: "/home" }, { label: "Organisation", href: "/org" }]} base="/org" sections={SECTIONS}
      sidebarTitle="Organisation"
      sidebar={<>
        <NavItem href="/org" exact>Overview</NavItem>
        <NavItem href="/org/cohorts">Cohorts</NavItem>
        <NavItem href="/org/people">People</NavItem>
        <NavSoon label="Courses" when="P1-04b" />
        <NavSoon label="Models" when="P1-15" />
        <NavSoon label="Credentials" when="Phase 4" />
        <NavSoon label="Settings" when="soon" />
      </>}>
      {children}
    </Shell>
  );
}
