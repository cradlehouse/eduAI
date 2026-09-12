import { notFound } from "next/navigation";
import { currentModule, getModules, getProject } from "@/lib/projects/data";
import { GateNotice } from "@/components/GateNotice";

// Minimal markdown: paragraphs and "## " headings. A real renderer comes with the bible/brief editor.
function Brief({ text }: { text: string }) {
  return (
    <div className="space-y-3 text-sm leading-relaxed">
      {text.split(/\n{2,}/).map((block, i) =>
        block.startsWith("## ") ? <h3 key={i} className="font-medium">{block.slice(3)}</h3> : <p key={i}>{block}</p>,
      )}
    </div>
  );
}

const STATE_LABEL = { open: "Open", upcoming: "Upcoming", locked: "Locked", closed: "Closed" } as const;

export default async function ModulePage({ params, searchParams }: { params: Promise<{ projectId: string }>; searchParams: Promise<{ m?: string }> }) {
  const { projectId } = await params;
  const { m } = await searchParams;
  const data = await getProject(projectId);
  if (!data) notFound();
  const mods = await getModules(data.project.cohort_id, data.project.id);
  const selected = (m && mods.find((x) => x.id === m)) || currentModule(mods);

  return (
    <div className="grid max-w-4xl gap-8 md:grid-cols-[220px_1fr]">
      <nav>
        <div className="mb-2 label">Modules</div>
        <ol className="flex flex-col gap-1 text-sm">
          {mods.map((x) => (
            <li key={x.id}>
              <a href={`?m=${x.id}`} className={`block rounded-full px-3 py-1 hover:bg-card ${selected?.id === x.id ? "bg-sand" : ""}`}>
                <span className="opacity-60">{x.module.position}.</span> {x.module.title}
                <span className={`ml-1 text-xs ${x.state === "open" ? "text-money" : "opacity-50"}`}>{STATE_LABEL[x.state]}</span>
              </a>
            </li>
          ))}
        </ol>
      </nav>
      <article>
        {selected ? (
          <>
            <div className="label">Module {selected.module.position}</div>
            <h1 className="mb-1 display text-2xl">{selected.module.title}</h1>
            <p className="mb-4 text-xs opacity-70">
              {selected.opens_at ? `Opens ${new Date(selected.opens_at).toLocaleDateString()}` : "No open date"}
              {selected.due_at ? ` · due ${new Date(selected.due_at).toLocaleDateString()}` : ""}
            </p>
            {selected.reason && <div className="mb-4"><GateNotice reason={selected.reason} /></div>}
            {selected.module.brief ? <Brief text={selected.module.brief} /> : <p className="text-sm opacity-60">No brief written for this module yet.</p>}
          </>
        ) : <p className="text-sm opacity-60">No modules scheduled.</p>}
      </article>
    </div>
  );
}
