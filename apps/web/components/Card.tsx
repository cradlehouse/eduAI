export function Card({ title, children }: { title?: string; children: React.ReactNode }) {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center p-6">
      <div className="card p-6 shadow-sm">
        {title && <h1 className="mb-4 display text-xl">{title}</h1>}
        {children}
      </div>
    </main>
  );
}
