import Link from "next/link";
import { PublicFrame } from "@/components/PublicFrame";

export const metadata = { title: "Imaje · How it works", description: "Script, cast, locations, props, scenes, shots and the edit: how a crew makes a film in Imaje, and who decides what." };

// How the product works, as built (docs/PRODUCTION_FLOW.md). Keep it to what exists today: when a step
// changes in the app, change it here. No claims beyond docs/research/brand-claims-2026-10.md.

const STEPS: [string, string][] = [
  ["Script", "Write or paste the script. Imaje breaks it down into the cast, the locations, the props and the scenes, and the crew checks everything it found before it's kept. If something looks like a character or place you already have, it asks whether it's the same one. The script stays the master copy: anything added on another page is written into it, with undo, and you can save numbered drafts and compare them."],
  ["Cast", "Build each character once. Describe them, make a few looks and choose one; that look goes into every shot they're in. A turnaround (front, side, back) is optional. Anyone with lines gets a voice: a stock voice, or a real person's voice only with a signed release, and a guardian's signature if they're under 18."],
  ["Locations", "Build each place once: a master wide, the angles your scenes need (made from the wide, so it stays the same room), other times of day, and its room tone, the sound of the place with nobody talking."],
  ["Props", "The objects the story depends on, described once so they look the same in every shot. Most films have only a few."],
  ["Scenes", "Put the location and the people in each scene. When the scene is set up, plan the shots: Imaje suggests a shot list from the script, with framing, camera movement and length, and the crew keeps, changes or drops each shot."],
  ["Shots", "Each shot has three steps. Camera: framing, movement and which view of the location. Frame: a still of the moment, checked for anyone who shouldn't be there before you build on it. Clip: the take itself, rough takes to find it, then a final one, and you choose the one that goes in the film."],
  ["Edit", "The chosen takes in script order, with the sound on separate tracks: each character's voice, the room tone, and music under the whole film. The edit says plainly what isn't in the film yet. Then export."],
];

export default function HowItWorks() {
  return (
    <PublicFrame current="how">
      <p className="label mb-3">How it works</p>
      <h1 className="display mb-6 text-4xl leading-tight" style={{ textWrap: "balance" }}>A film is scenes. A scene is shots. Every shot is a choice.</h1>
      <p className="mb-10 max-w-[62ch] text-lg leading-relaxed">
        Students join a cohort, sign up for a production with the crew roles they want, and make the film the way a real production does: script first, then
        the people and places, then scene by scene, shot by shot. AI renders the pictures and sound. The crew makes every decision, and the app always says what&apos;s next.
      </p>

      <h2 className="display mb-3 text-2xl">The steps</h2>
      <ol className="mb-10 grid gap-3">
        {STEPS.map(([name, text], i) => (
          <li key={name} className="card flex gap-4 p-4">
            <span className="mono pt-0.5 text-[13px] text-gold">{i + 1}</span>
            <span><span className="display mb-1 block text-[16px]">{name}</span><span className="text-[14px] leading-relaxed text-dim">{text}</span></span>
          </li>
        ))}
      </ol>

      <h2 className="display mb-3 text-2xl">Sound</h2>
      <p className="mb-10 max-w-[62ch] text-[15px] leading-relaxed">
        In a talking shot, the video engine performs the lines with the picture. Imaje then splits the speech by speaker and re-voices each line in that
        character&apos;s chosen voice, so every character sounds like themselves in every shot, on their own track. Room tone is made once per location and runs
        under every shot there, so the sound doesn&apos;t jump at a cut. Music sits under the whole film.
      </p>

      <h2 className="display mb-3 text-2xl">One look, one engine</h2>
      <p className="mb-10 max-w-[62ch] text-[15px] leading-relaxed">
        The crew sets the film&apos;s look once, from the school&apos;s list, and every picture follows it. Every shot is made with the same video engine, so the
        whole film matches.
      </p>

      <h2 className="display mb-3 text-2xl">Tokens</h2>
      <p className="mb-10 max-w-[62ch] text-[15px] leading-relaxed">
        Every look, frame and take costs tokens, and the cost is on the button before you press it. Students and instructors see tokens, never money; the school
        sets what a token is worth. Tokens are held when a job starts and returned if it fails or is refused. Every finished take keeps a receipt: the model,
        what went in, the consent behind anyone real in it, and the cost.
      </p>

      <h2 className="display mb-3 text-2xl">Who decides what</h2>
      <ul className="mb-10 max-w-[62ch] space-y-2 text-[15px] leading-relaxed">
        <li><b>Students</b> make the film: the script, the cast and places, the shots and the takes. Crew roles are credits, like on a real set.</li>
        <li><b>Instructors</b> see every production in their cohort, set the schedule of briefs, and can ask for sign-off on changes to a script.</li>
        <li><b>The school</b> sets which AI models can be used, the content level for its students, what a token is worth, and the budget.</li>
      </ul>

      <h2 className="display mb-3 text-2xl">Safety</h2>
      <p className="mb-4 max-w-[62ch] text-[15px] leading-relaxed">
        No real person&apos;s face or voice is used without a signed release, and a guardian signs for anyone under 18. Nobody under 13 can join. Every prompt is
        checked against the school&apos;s content level before a model sees it.
      </p>
      <p className="max-w-[62ch] text-[15px] leading-relaxed">
        <Link href="/#alpha" className="text-gold underline decoration-gold/40 underline-offset-4 hover:decoration-gold">Join the alpha →</Link>
      </p>
    </PublicFrame>
  );
}
