import { PublicFrame } from "@/components/PublicFrame";

export const metadata = { title: "Imaje · Mission", description: "Teach young people to make films with AI: creatively, with integrity, and without pretending the resource cost is zero." };

export default function Mission() {
  return (
    <PublicFrame current="mission">
      <p className="label mb-3">Mission</p>
      <h1 className="display mb-6 text-4xl leading-tight" style={{ textWrap: "balance" }}>Teach young people to make films with AI, and to make them well.</h1>
      <p className="mb-10 max-w-[62ch] text-lg leading-relaxed">
        The tools are here. Fourteen-year-olds can already generate a shot in a minute. What they can&apos;t get anywhere is a place that teaches
        the craft around the button: what a cut is for, whose face is in it, what it cost, and what to do when the machine gives you
        something you didn&apos;t ask for. Imaje is that place. A studio built for cohorts, where the film comes first and the model is a crew member.
      </p>

      <h2 className="display mb-3 text-2xl">Three promises</h2>
      <div className="mb-10 grid gap-4 sm:grid-cols-3">
        <section className="card p-5">
          <div className="label mb-2 text-dim">Creative</div>
          <p className="text-sm leading-relaxed">Students write the brief, draw the board, choose the look, and direct the take. Explore cheaply, compare honestly, finish deliberately. The messy first takes are the lesson, not a mistake.</p>
        </section>
        <section className="card p-5">
          <div className="label mb-2 text-ok">Integrity</div>
          <p className="text-sm leading-relaxed">Every model is rated on what it was trained on, what its licence allows, where it runs, and what it discloses. Every real person has a signed release before they appear. Every take has a receipt.</p>
        </section>
        <section className="card p-5">
          <div className="label mb-2 text-dim">Resource-neutral</div>
          <p className="text-sm leading-relaxed">We don&apos;t invent a carbon number for a closed model. We rate disclosure, run on a carbon-neutral cloud region, prefer open weights we can measure ourselves, and teach that a shorter take is a cheaper take.</p>
        </section>
      </div>

      <h2 className="display mb-3 text-2xl">What integrity means here</h2>
      <ul className="mb-10 max-w-[62ch] space-y-3 text-[15px] leading-relaxed">
        <li><b>Consent is specific.</b> A character built on a real person needs a release that names the person, the uses, and the lane it permits. Revoke it, and generation stops. Nothing about an under-18 is ever cloned: voice, face, or likeness.</li>
        <li><b>Prompts pass a gate.</b> Before a prompt reaches a model, it&apos;s checked against the school&apos;s content tier. A refusal costs nothing and comes with one sentence a teacher can show the student.</li>
        <li><b>Models are rows in a register, not a brand.</b> Training-data disclosure, licence, indemnity, likeness risk, hosting region, energy disclosure. Students see the rating on the tile before they spend a token.</li>
        <li><b>Receipts are permanent.</b> Which model, which version, which prompt, whose consent, what it cost, what it likely used. Kill a take and it leaves the bin, never the record.</li>
      </ul>

      <h2 className="display mb-3 text-2xl">What resource-neutral means here</h2>
      <p className="mb-4 max-w-[62ch] text-[15px] leading-relaxed">
        Almost no video model publishes what a generation costs in energy or water. Making a number up would be a lie, so we don&apos;t. Each model
        carries a disclosure tier: <b>A</b> when the method is published, <b>B</b> when only independent research exists, <b>C</b> when there&apos;s nothing. Today nobody is A.
        The platform earns an A itself only where it controls the machine: open-weight models on infrastructure we can meter.
      </p>
      <p className="mb-10 max-w-[62ch] text-[15px] leading-relaxed">
        What we control, we choose carefully: the database sits in a carbon-neutral AWS region, and the self-hosted route runs on stranded-energy GPU compute.
        And the finding we teach on day one: doubling a clip&apos;s length roughly quadruples its energy. Plan the cut, then generate.
      </p>

      <h2 className="display mb-3 text-2xl">Why open models</h2>
      <p className="mb-4 max-w-[62ch] text-[15px] leading-relaxed">
        The everyday routes are open-weight. That matters for a school in three plain ways. A student&apos;s film and the faces in it can stay on
        infrastructure the school chooses, rather than becoming someone&apos;s training data. The model can be inspected and, on our own machines, metered,
        which is the only honest route to a real energy number. And the same family carries a cut from first sketch to final take, with camera
        logic, keyframes, extension and synced sound, so the look holds instead of changing every time a student changes tools.
      </p>
      <p className="max-w-[62ch] text-[15px] leading-relaxed">
        Closed models stay on the menu for a finish that wants them, with their ratings shown, never as the default. Openness here is not a slogan;
        it&apos;s what lets us keep the promises above.
      </p>
    </PublicFrame>
  );
}
