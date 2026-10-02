import Link from "next/link";
import InteractiveExample from "@/components/InteractiveExample";
import { GlassCard } from "@/components/ui";

const FLOW = [
  {
    step: "01",
    title: "Define the claim",
    body: "State exactly what you did — one explicit, falsifiable sentence. Not a vibe, a claim.",
  },
  {
    step: "02",
    title: "Attach evidence",
    body: "Live URLs, GitHub repos and commits, screenshots, files, certificates. Each item is timestamped.",
  },
  {
    step: "03",
    title: "Run verification",
    body: "Proofly independently checks what can be checked — URL reachability, repo existence, timestamp consistency. The rest is marked honestly.",
  },
  {
    step: "04",
    title: "Share the proof",
    body: "A permanent public page at /p/PF-XXXXXX with a QR code and a downloadable snapshot card for LinkedIn, X and your CV.",
  },
];

const WHY = [
  {
    title: "Portfolios are promises",
    body: "“Built a fintech dashboard” on a portfolio is a claim with no weight behind it. Anyone can type it. Hiring managers know this.",
  },
  {
    title: "Evidence is inspectable",
    body: "A Proofly page separates the claim from the evidence from the checks. A reader can see exactly what was technically confirmed — and what wasn't.",
  },
  {
    title: "Verification is honest",
    body: "We never fake a check. If a URL can't be reached or a video can't be inspected automatically, the page says “Could not independently verify.” Trust comes from what's disclosed, not what's hidden.",
  },
];

export default function LandingPage() {
  return (
    <div className="animate-fade-up">
      {/* HERO */}
      <section className="mx-auto max-w-4xl pb-16 pt-14 text-center sm:pt-20">
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-cyan-400/25 bg-cyan-400/10 px-4 py-1.5 text-xs font-semibold tracking-widest text-cyan-300 uppercase">
          <span className="h-1.5 w-1.5 animate-pulse-dot rounded-full bg-cyan-400" />
          Universal Proof of Work
        </div>
        <h1 className="font-display text-5xl font-bold leading-[1.05] tracking-tight text-white sm:text-7xl">
          PROOF<span className="bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">LY</span>
        </h1>
        <p className="mx-auto mt-6 max-w-2xl font-display text-xl text-slate-300 sm:text-2xl">
          Don&apos;t just say you did the work. <span className="text-white">Prove it.</span>
        </p>
        <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-slate-400 sm:text-base">
          Create verifiable records of work you&apos;ve completed — a specific claim, the evidence behind it,
          independent verification checks, and a permanent shareable proof page.
        </p>
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            href="/signup"
            className="w-full rounded-xl bg-gradient-to-r from-cyan-400 to-blue-500 px-8 py-3.5 text-sm font-bold text-[#04121a] transition hover:brightness-110 sm:w-auto"
          >
            Create your first proof
          </Link>
          <Link
            href="#how"
            className="w-full rounded-xl border border-white/15 bg-white/[0.05] px-8 py-3.5 text-sm font-semibold text-white transition hover:border-cyan-400/40 sm:w-auto"
          >
            See how it works
          </Link>
        </div>
      </section>

      {/* FLOW */}
      <section id="how" className="mx-auto max-w-6xl pb-16">
        <div className="mb-8 text-center">
          <p className="text-xs font-semibold uppercase tracking-widest text-cyan-400">The product flow</p>
          <h2 className="mt-2 font-display text-3xl font-bold text-white">Claim → Evidence → Verification → Proof</h2>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {FLOW.map((f) => (
            <GlassCard key={f.step} className="p-6">
              <p className="font-mono text-xs text-cyan-400/70">{f.step}</p>
              <h3 className="mt-2 font-display text-base font-semibold text-white">{f.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-400">{f.body}</p>
            </GlassCard>
          ))}
        </div>
      </section>

      {/* INTERACTIVE EXAMPLE */}
      <section className="mx-auto max-w-4xl pb-16">
        <div className="mb-8 text-center">
          <p className="text-xs font-semibold uppercase tracking-widest text-cyan-400">A realistic example</p>
          <h2 className="mt-2 font-display text-3xl font-bold text-white">One proof, end to end</h2>
          <p className="mt-2 text-sm text-slate-400">Click through the tabs — this is what a real proof page contains.</p>
        </div>
        <InteractiveExample />
      </section>

      {/* WHY */}
      <section className="mx-auto max-w-6xl pb-16">
        <div className="mb-8 text-center">
          <p className="text-xs font-semibold uppercase tracking-widest text-cyan-400">Why Proofly exists</p>
          <h2 className="mt-2 font-display text-3xl font-bold text-white">Your portfolio tells people what you claimed to do.</h2>
          <p className="mt-2 font-display text-xl text-cyan-300">Proofly shows them the evidence.</p>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {WHY.map((w) => (
            <GlassCard key={w.title} className="p-6">
              <h3 className="font-display text-base font-semibold text-white">{w.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-400">{w.body}</p>
            </GlassCard>
          ))}
        </div>
      </section>

      {/* WHO IT'S FOR + CTA */}
      <section className="mx-auto max-w-4xl pb-8 text-center">
        <GlassCard className="px-6 py-12">
          <h2 className="font-display text-2xl font-bold text-white sm:text-3xl">Built for people with receipts.</h2>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-slate-400">
            Developers, designers, students, freelancers, researchers, creators and open-source contributors —
            anyone whose work deserves more than a bullet point.
          </p>
          <Link
            href="/signup"
            className="mt-8 inline-block rounded-xl bg-gradient-to-r from-cyan-400 to-blue-500 px-8 py-3.5 text-sm font-bold text-[#04121a] transition hover:brightness-110"
          >
            Start proving your work
          </Link>
          <p className="mt-4 text-xs text-slate-500">Free to start · Public proof pages need no account to view</p>
        </GlassCard>
      </section>
    </div>
  );
}
