import Link from "next/link";

// The signed-out frame: two public pages and a way in. Same paper, same type, no sidebar.
export function PublicFrame({ current, children }: { current: "mission" | "how"; children: React.ReactNode }) {
  const tab = (href: string, label: string, on: boolean) => <Link href={href} className={`rounded-full px-3 py-1 text-sm ${on ? "bg-ink text-paper" : "hover:bg-sand"}`}>{label}</Link>;
  return (
    <div className="min-h-screen">
      <header className="flex items-center gap-3 border-b border-line bg-card px-5 py-2">
        <Link href="/mission" className="display text-base">Imaje</Link>
        <nav className="ml-2 flex gap-1">{tab("/mission", "Mission", current === "mission")}{tab("/how-it-works", "How it works", current === "how")}</nav>
        <Link href="/login" className="btn ml-auto">Sign in</Link>
      </header>
      <main className="mx-auto max-w-3xl px-6 py-12">{children}</main>
      <footer className="mx-auto max-w-3xl px-6 pb-12 text-xs text-muted">Built with Pegasus Media Project, Dallas. Students see tokens, never money; every take carries a receipt.</footer>
    </div>
  );
}
