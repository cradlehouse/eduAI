import { redirect } from "next/navigation";
import { getNav } from "@/lib/auth/nav";
import { Shell } from "@/components/Shell";

export default async function HomeLayout({ children }: { children: React.ReactNode }) {
  const nav = await getNav();
  if (!nav) redirect("/login");
  return (
    <Shell nav={nav} crumbs={[{ label: nav.org?.name ?? "Imaje", image: nav.org?.mark_url }, { label: "Home" }]}>
      {children}
    </Shell>
  );
}
