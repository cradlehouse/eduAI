import { PublicFrame } from "@/components/PublicFrame";

export const metadata = { title: "eduai · How it works", description: "Scenes, cuts, layers, lanes, routes and tokens: how a cohort makes a film in eduai." };

const LAYERS = [
  ["Background", "The location plate. Generated once, reused across every cut in the scene, so the room stays the same room."],
  ["Character", "The consent-bearing pass. Anyone real in it has a signed release; the plate frame is the reference."],
  ["Merged", "The take you compare and choose. Three routes, three results, one decision, one tick."],
  ["Dialogue", "The line from the e-conte notes, voiced. Real voices need a voice release; under-18s never clone."],
  ["SFX", "Foley and ambience per cut: rain on the roof, a door, footsteps."],
  ["Music", "Scored to the locked cut at the timeline stage, the last layer, not the first."],
];

export default function HowItWorks() {
  return (
    <PublicFrame current="how">
      <p className="label mb-3">How it works</p>
      <h1 className="display mb-6 text-4xl leading-tight" style={{ textWrap: "balance" }}>A film is scenes. A scene is cuts. A cut is layers.</h1>
      <p className="mb-10 max-w-[62ch] text-lg leading-relaxed">
        Students sign into a cohort, join a project with the roles they want, and work the film from brief to board to takes. Nothing is
        generated until the cut has its notes: what it&apos;s for, what it must match, how the camera moves. That&apos;s the e-conte discipline, and it&apos;s the whole point.
      </p>

      <h2 className="display mb-3 text-2xl">The layers of a cut</h2>
      <div className="mb-10 grid gap-3 sm:grid-cols-2">
        {LAYERS.map(([name, text]) => (
          <section key={name} className="card p-4"><div className="display mb-1">{name}</div><p className="text-sm leading-relaxed">{text}</p></section>
        ))}
      </div>

      <h2 className="display mb-3 text-2xl">Three lanes, one film</h2>
      <div className="mb-10 grid gap-3 sm:grid-cols-3">
        <section className="card p-4"><div className="label mb-1 text-explore">Explore</div><p className="text-sm leading-relaxed">Quick, cheap tests. Ten takes to find the shot. Previz, in film terms.</p></section>
        <section className="card p-4"><div className="label mb-1 text-control">Control</div><p className="text-sm leading-relaxed">References, seeds, settings. Reproducible, so a good result can be made again.</p></section>
        <section className="card p-4"><div className="label mb-1 text-finish">Finish</div><p className="text-sm leading-relaxed">Release quality for the cut you keep. Same model family as explore where possible, so the look carries.</p></section>
      </div>

      <h2 className="display mb-3 text-2xl">Routes and tokens</h2>
      <p className="mb-4 max-w-[62ch] text-[15px] leading-relaxed">
        A route is one model on one provider, approved by the school and rated on the tile: integrity, energy disclosure, what it&apos;s good and bad at. Students
        pick the route and see the cost before they commit. The cost is in <b>tokens</b>: the school decides the rate; students and instructors never see money.
        Tokens are reserved when a job starts and returned if it fails or is refused.
      </p>
      <p className="mb-10 max-w-[62ch] text-[15px] leading-relaxed">
        The look of the film is set once per project by the crew, from the school&apos;s list, and leads every picture prompt. Style is a decision, not a surprise.
      </p>

      <h2 className="display mb-3 text-2xl">The bible and the gate</h2>
      <p className="mb-4 max-w-[62ch] text-[15px] leading-relaxed">
        Characters, locations, props, styles and voices live in the project bible. A cut says which entries it uses; anything depicting a real person needs a
        valid release for the lane, or the cut stays locked. Every prompt is checked against the school&apos;s content tier before a model sees it.
      </p>
      <p className="mb-10 max-w-[62ch] text-[15px] leading-relaxed">
        When a take lands, its receipt records the model version, the route, the prompt, the consent basis, the gate&apos;s verdict, the cost, and the energy
        disclosure tier. Kill a take and it&apos;s gone from the bin, not from the record. Restore it any time.
      </p>

      <h2 className="display mb-3 text-2xl">Who does what</h2>
      <ul className="max-w-[62ch] space-y-2 text-[15px] leading-relaxed">
        <li><b>Students</b> choose everything about the film: roles, look, routes, takes. The platform teaches by showing cost and rating, not by locking doors.</li>
        <li><b>Instructors</b> see every person in the cohort, their project and roles, every job and what it cost, and the schedule of briefs.</li>
        <li><b>The school</b> sets the model allowlist, the content tier, the token rate and the list of looks.</li>
      </ul>
    </PublicFrame>
  );
}
