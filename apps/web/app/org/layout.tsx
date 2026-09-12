import { redirect } from "next/navigation";
import { getAdminOrg } from "@/lib/auth/org";
import { getNav } from "@/lib/auth/nav";
import { Sidebar } from "@/components/Sidebar";

export default async function OrgLayout({ children }: { children: React.ReactNode }) {
  const [org, nav] = await Promise.all([getAdminOrg(), getNav()]);
  if (!org || !nav) redirect("/");
  return (
    <div className="flex min-h-screen">
      <Sidebar nav={nav} ctx={{}} />
      <main className="flex-1 p-8">{children}</main>
    </div>
  );
}
