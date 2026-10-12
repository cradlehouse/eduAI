import Link from "next/link";
import { Building2, Clapperboard, FileText, Film, Package, UserRound } from "lucide-react";
import { Logo } from "@/components/Logo";
import { AlphaForm } from "@/app/alpha/AlphaForm";

// The public front page (imaje.app/ when signed out). Copy is plain and factual on purpose: every line
// is true today (docs/BRAND.md "Say where we are"; docs/research/brand-claims-2026-10.md). It's a
// placeholder until a brand designer writes the real lines; check any change against those two files.
// No student faces, no generic AI imagery, nothing in a partner's name without their sign-off.

const STEPS = [
  { icon: FileText, name: "Script", text: "Write or paste it. Imaje finds the cast, locations, props and scenes, and you check what it found before anything is kept." },
  { icon: UserRound, name: "Cast", text: "Design each character once: how they look, and how they sound if they speak." },
  { icon: Building2, name: "Locations", text: "Build each place once: a master wide, the angles you need, and the sound of the room." },
  { icon: Package, name: "Props", text: "The objects the story depends on, described once so they match in every shot." },
  { icon: Clapperboard, name: "Scenes and shots", text: "Put the people and places in each scene and plan the shots. For each shot, choose the frame, then the take." },
  { icon: Film, name: "Edit", text: "Your chosen takes in order, each character on their own voice track, with room tone and music. Then export." },
];

const PROTECTED = [
  "No real person's face or voice without a signed release, and a guardian's signature for anyone under 18.",
  "Nobody under 13.",
  "Prompts are screened before anything is made.",
  "Educators set the budget and can ask for sign-off on changes to the script.",
  "The cost of every take is shown before it runs. Students see tokens, not money.",
  "Every take keeps a receipt: the model, what went in, the consent behind it, and the cost.",
];

export function Landing() {
  return (
    <div className="canvas min-h-screen">
      <header className="mx-auto flex max-w-6xl items-center gap-3 px-5 py-5">
        <Link href="/" aria-label="Imaje" className="text-ink"><Logo className="h-7 w-auto" /></Link>
        <nav className="ml-auto flex items-center gap-1 text-[14px]">
          <Link href="/how-it-works" className="hidden rounded-full px-3 py-1.5 text-dim hover:text-ink sm:block">How it works</Link>
          <Link href="/mission" className="hidden rounded-full px-3 py-1.5 text-dim hover:text-ink sm:block">Mission</Link>
          <Link href="/login" className="rounded-full px-3 py-1.5 text-dim hover:text-ink">Sign in</Link>
          <a href="#alpha" className="btn-primary ml-1 px-4 py-2 text-[13px]">Join the alpha</a>
        </nav>
      </header>

      <main className="mx-auto max-w-6xl px-5">
        {/* Opening: what it is, in one line, and the way in. */}
        <section className="grid items-center gap-10 py-14 md:grid-cols-[1.1fr_1fr] md:py-24">
          <div>
            <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-glass-edge px-3 py-1 text-[12px] text-dim">
              <span className="h-1.5 w-1.5 rounded-full bg-gold" /> Alpha · for schools and youth programmes
            </p>
            <h1 className="display text-[44px] leading-[1.05] tracking-[-0.01em] md:text-[60px]" style={{ textWrap: "balance" }}>A film school in the browser.</h1>
            <p className="mt-5 max-w-[46ch] text-[17px] leading-relaxed text-dim">
              Students write the script, design the cast and the world, plan every shot, choose the takes and cut the film. AI renders the frames.
              <span className="text-ink"> Every creative decision stays with the student.</span>
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <a href="#alpha" className="btn-primary px-5 py-2.5 text-[14px]">Join the alpha</a>
              <a href="#how" className="btn px-5 py-2.5 text-[14px]">See how a film gets made</a>
            </div>
          </div>

          {/* The product as it looks: a production board, not a stock image. */}
          <div className="glass p-4" aria-hidden="true">
            <div className="flex items-center gap-2 text-[12px] text-mute"><span className="h-2 w-2 rounded-full bg-gold" />Last Call · Scene 3 · Kitchen, night</div>
            <div className="mt-3 flex gap-1.5">
              {STEPS.map((s, i) => (
                <div key={s.name} className={`flex flex-1 flex-col items-center gap-1 rounded-[8px] py-2 text-[10px] ${i === 4 ? "bg-field text-gold" : "text-dim"}`}>
                  <s.icon size={16} strokeWidth={1.6} />{s.name.split(" ")[0]}
                </div>
              ))}
            </div>
            <ol className="mt-3 flex flex-col gap-1.5">
              {[["3.1", "Wide", "Static · 6s", "Take chosen"], ["3.2", "Marla in the doorway", "Push in · 5s", "Choosing a frame"], ["3.3", "Over Marla to Bert", "Over the shoulder · 6s", "Next"]].map(([n, label, how, state], i) => (
                <li key={n} className="flex items-center gap-3 rounded-[8px] border border-glass-edge bg-field px-3 py-2.5">
                  <span className="mono text-[12px] text-mute">{n}</span>
                  <span className="min-w-0 flex-1"><span className="block text-[13px]">{label}</span><span className="text-[11px] text-mute">{how}</span></span>
                  <span className={`text-[11px] ${i === 0 ? "text-ok" : i === 1 ? "text-gold" : "text-mute"}`}>{state}</span>
                </li>
              ))}
            </ol>
            <p className="mt-3 text-[12px] text-gold">Next: choose the frame for 3.2 →</p>
          </div>
        </section>

        {/* How a film gets made: the real steps, in the real order. */}
        <section id="how" className="scroll-mt-6 border-t border-glass-edge py-16">
          <p className="label mb-2 text-dim">How a film gets made</p>
          <h2 className="display max-w-[24ch] text-[30px] leading-tight" style={{ textWrap: "balance" }}>The same steps as a real production, one at a time.</h2>
          <ol className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {STEPS.map((s, i) => (
              <li key={s.name} className="glass flex flex-col gap-2 p-5">
                <span className="flex items-center gap-2 text-gold"><s.icon size={18} strokeWidth={1.6} /><span className="mono text-[12px] text-mute">{i + 1}</span></span>
                <span className="display text-[17px]">{s.name}</span>
                <span className="text-[14px] leading-relaxed text-dim">{s.text}</span>
              </li>
            ))}
          </ol>
        </section>

        {/* Protected by default, and where we honestly are. */}
        <section className="grid gap-10 border-t border-glass-edge py-16 md:grid-cols-2">
          <div>
            <p className="label mb-2 text-dim">Protected by default</p>
            <h2 className="display text-[26px] leading-tight">The safe way is the normal way.</h2>
            <ul className="mt-6 flex flex-col gap-3">
              {PROTECTED.map((t) => <li key={t} className="flex gap-3 text-[15px] leading-relaxed"><span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-gold" /><span>{t}</span></li>)}
            </ul>
          </div>
          <div>
            <p className="label mb-2 text-dim">Where we are</p>
            <h2 className="display text-[26px] leading-tight">Straight answers about the AI.</h2>
            <ul className="mt-6 flex flex-col gap-3 text-[15px] leading-relaxed">
              <li className="flex gap-3"><span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-ok" /><span>Music and sound effects come from models trained on licensed and Creative Commons audio.</span></li>
              <li className="flex gap-3"><span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-mute" /><span>The video and image models aren&apos;t trained only on licensed work yet. We won&apos;t say otherwise, and we&apos;ll switch to fairly trained models as they become good enough.</span></li>
              <li className="flex gap-3"><span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-mute" /><span>Making video with AI uses real energy. A shorter take uses less, so every take is a choice.</span></li>
              <li className="flex gap-3"><span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-ok" /><span>Claude, the model that reads students&apos; scripts, isn&apos;t trained on them.</span></li>
            </ul>
            <Link href="/mission" className="mt-6 inline-block text-[14px] text-gold underline decoration-gold/40 underline-offset-4 hover:decoration-gold">Read the mission →</Link>
          </div>
        </section>

        {/* The alpha. */}
        <section id="alpha" className="scroll-mt-6 border-t border-glass-edge py-16">
          <div className="grid gap-10 md:grid-cols-[1fr_1.4fr]">
            <div>
              <p className="label mb-2 text-dim">Alpha</p>
              <h2 className="display text-[30px] leading-tight">Join the alpha.</h2>
              <p className="mt-4 max-w-[40ch] text-[15px] leading-relaxed text-dim">
                We&apos;re opening Imaje to a small number of schools and youth programmes. It&apos;s early: things will change, and what you tell us decides what comes next.
              </p>
            </div>
            <div className="glass p-5 sm:p-6"><AlphaForm /></div>
          </div>
        </section>
      </main>

      <footer className="mx-auto flex max-w-6xl flex-wrap items-center gap-4 border-t border-glass-edge px-5 py-8 text-[13px] text-dim">
        <Logo className="h-5 w-auto text-ink" />
        <Link href="/how-it-works" className="hover:text-ink">How it works</Link>
        <Link href="/mission" className="hover:text-ink">Mission</Link>
        <Link href="/login" className="hover:text-ink">Sign in</Link>
        <Link href="/privacy" className="hover:text-ink">Privacy</Link>
        <span className="ml-auto text-mute">© 2026 Imaje</span>
      </footer>
    </div>
  );
}
