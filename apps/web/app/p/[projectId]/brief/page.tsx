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

const fmt = (d: string) => new Date(d).toLocaleDateString();

// The Brief is what the crew is working on right now. The full schedule lives on the cohort's
// Schedule page (instructors) and the phases live in the sidebar — no second menu here.
export default async function BriefPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const data = await getProject(projectId);
  if (!data) notFound();
  const mods = await getModules(data.project.cohort_id, data.project.id);
  const current = currentModule(mods);
  const next = current ? mods.find((m) => m.module.position > current.module.position) : null;
  const done = mods.filter((m) => m.state === "closed").length;

  if (!current) return <p className="text-sm opacity-60">Nothing scheduled for this cohort yet.</p>;

  return (
    <article className="max-w-2xl">
      <div className="label">This week · brief {current.module.position} of {mods.length}</div>
      <h1 className="mb-1 display text-2xl">{current.module.title}</h1>
      <p className="mb-4 text-xs opacity-70">
        {current.state === "closed" ? "Closed" : current.opens_at ? `Opens ${fmt(current.opens_at)}` : "Open"}
        {current.due_at ? ` · due ${fmt(current.due_at)}` : ""}
      </p>
      {current.reason && <div className="mb-4"><GateNotice reason={current.reason} /></div>}
      {current.module.brief ? <Brief text={current.module.brief} /> : <p className="text-sm opacity-60">No brief written for this week yet.</p>}

      {(next || done > 0) && (
        <p className="mt-8 border-t border-line pt-4 text-xs text-muted">
          {done > 0 && <>{done} brief{done === 1 ? "" : "s"} done. </>}
          {next && <>Next up: {next.module.title}{next.opens_at ? ` from ${fmt(next.opens_at)}` : ""}.</>}
        </p>
      )}
    </article>
  );
}
