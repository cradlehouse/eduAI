export function Card({ title, children }: { title?: string; children: React.ReactNode }) {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center p-6">
      <div className="rounded-xl border border-ink/10 bg-white/60 p-6 shadow-sm dark:border-paper/15 dark:bg-white/5">
        {title && <h1 className="mb-4 text-xl font-semibold">{title}</h1>}
        {children}
      </div>
    </main>
  );
}
