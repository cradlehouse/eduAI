import Link from "next/link";
import { PublicFrame } from "@/components/PublicFrame";

export const metadata = { title: "Imaje · Privacy", description: "What Imaje does with the details you give on this website and the alpha sign-up." };

// Plain privacy notice for the public website and the alpha sign-up only. Students' data inside a school
// needs the full notice and data agreement (docs/research/brand-roadmap-2026-10.md: amended COPPA, lawyer
// review); this page says that rather than pretending to cover it. Facts here must stay true: where the
// data lives (Supabase, AWS us-west-2), who processes it, and what we promise on deletion.

const UPDATED = "12 October 2026";

function H({ children }: { children: React.ReactNode }) {
  return <h2 className="display mb-2 mt-9 text-[20px]">{children}</h2>;
}

export default function Privacy() {
  return (
    <PublicFrame current="privacy">
      <p className="label mb-3">Privacy</p>
      <h1 className="display mb-3 text-4xl leading-tight">Your details, plainly.</h1>
      <p className="text-[13px] text-mute">Last updated {UPDATED}</p>

      <div className="max-w-[64ch] text-[15px] leading-relaxed">
        <H>Who we are</H>
        <p>Imaje is run by Cradle House. For anything on this page, including having your details removed, email <a className="text-gold underline" href="mailto:privacy@imaje.app">privacy@imaje.app</a>.</p>

        <H>What this page covers</H>
        <p>This website and the alpha sign-up form. Schools and programmes that use Imaje with students get a separate privacy notice and data agreement covering students&apos; work and accounts, written for that use (including the US children&apos;s privacy rules) and reviewed by a lawyer. That notice isn&apos;t published yet; we&apos;ll share it with every school before students start.</p>

        <H>What we collect when you sign up for the alpha</H>
        <ul className="ml-5 list-disc space-y-1">
          <li>Your name and email address.</li>
          <li>Your school or programme, what you do, and roughly how many students you work with, if you tell us.</li>
          <li>Anything you write in the note.</li>
          <li>That you confirmed you&apos;re 18 or over.</li>
        </ul>
        <p className="mt-2">Nothing else from the form. The alpha is for adults: if we find a sign-up from someone under 18, we delete it.</p>

        <H>What we use it for</H>
        <p>To contact you about the alpha: whether there&apos;s a place, when it starts, and what we&apos;d need from you. We don&apos;t sell it, we don&apos;t share it for anyone else&apos;s marketing, and we don&apos;t use it to train AI. If you&apos;re in the UK or EU, we rely on your consent, which you can withdraw at any time by emailing us.</p>

        <H>Where it&apos;s kept and who handles it</H>
        <ul className="ml-5 list-disc space-y-1">
          <li><b>Supabase</b> stores the sign-up list in its database, hosted on Amazon Web Services in Oregon, USA. Only the Imaje team can read it.</li>
          <li><b>Cloudflare</b> runs this website. Like any host, it sees technical details such as your IP address to deliver pages and block attacks.</li>
          <li><b>Sentry</b> receives error reports when something on the site breaks, with personal details switched off.</li>
        </ul>
        <p className="mt-2">If you&apos;re outside the US, your details are transferred to the US to be stored.</p>

        <H>Cookies</H>
        <p>These pages don&apos;t use advertising or analytics cookies. If you sign in, a cookie keeps you signed in; that&apos;s all it does.</p>

        <H>How long we keep it</H>
        <p>Until you ask us to delete it, or until we no longer need it for the alpha, whichever comes first. At the latest, we delete alpha sign-ups 12 months after the alpha ends.</p>

        <H>Your rights</H>
        <p>Email <a className="text-gold underline" href="mailto:privacy@imaje.app">privacy@imaje.app</a> to see what we hold about you, correct it, or have it deleted. We reply within 30 days. If you&apos;re in the UK or EU and unhappy with our answer, you can complain to your data protection regulator (in the UK, the ICO).</p>

        <H>Changes</H>
        <p>If this changes, we&apos;ll update the date at the top. If a change affects how we use details you&apos;ve already given us, we&apos;ll email you first.</p>

        <p className="mt-10 text-[14px] text-dim"><Link href="/" className="underline">Back to the front page</Link></p>
      </div>
    </PublicFrame>
  );
}
