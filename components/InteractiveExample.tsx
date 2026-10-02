"use client";

import { useState } from "react";
import { GlassCard, StatusBadge } from "@/components/ui";

const TABS = ["Claim", "Evidence", "Verification", "Proof page"] as const;

const EVIDENCE = [
  { t: "Live website", d: "https://adaeze-bakes.ng — HTTP 200, reachable", ok: true },
  { t: "GitHub repository", d: "github.com/adaeze/bakery-site — repo exists, 34 commits", ok: true },
  { t: "Deployment log", d: "Vercel deploy 2h after final commit — timestamps consistent", ok: true },
  { t: "Client testimonial video", d: "No automated check for video — needs a human verifier", ok: null },
];

export default function InteractiveExample() {
  const [tab, setTab] = useState<(typeof TABS)[number]>("Claim");

  return (
    <GlassCard className="overflow-hidden">
      <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
        <div className="flex items-center gap-3">
          <StatusBadge status="VERIFIED" />
          <span className="font-mono text-xs text-cyan-400/80">PF-7X92K4</span>
        </div>
        <div className="flex gap-1 rounded-xl bg-white/5 p-1">
          {TABS.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                tab === t ? "bg-cyan-400/20 text-cyan-200" : "text-slate-400 hover:text-white"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <div className="min-h-[260px] px-5 py-6 sm:px-8">
        {tab === "Claim" && (
          <div className="animate-fade-up">
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">The claim</p>
            <p className="mt-2 font-display text-xl font-semibold text-white sm:text-2xl">
              “I designed and deployed an AI-powered website for a bakery in Lagos.”
            </p>
            <p className="mt-3 text-sm leading-relaxed text-slate-400">
              Adaeze O. — Contribution: UI design, frontend development, deployment. Completed March 2026.
            </p>
          </div>
        )}
        {tab === "Evidence" && (
          <div className="animate-fade-up space-y-3">
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">The evidence — 4 items attached</p>
            {EVIDENCE.map((e) => (
              <div key={e.t} className="flex items-start gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-3">
                <span
                  className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                    e.ok === true ? "bg-emerald-500/20 text-emerald-300" : e.ok === false ? "bg-rose-500/20 text-rose-300" : "bg-slate-500/20 text-slate-300"
                  }`}
                >
                  {e.ok === true ? "✓" : e.ok === false ? "✕" : "?"}
                </span>
                <div>
                  <p className="text-sm font-medium text-white">{e.t}</p>
                  <p className="font-mono text-xs text-slate-500">{e.d}</p>
                </div>
              </div>
            ))}
          </div>
        )}
        {tab === "Verification" && (
          <div className="animate-fade-up">
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">What Proofly actually checked</p>
            <div className="mt-4 flex items-center gap-4">
              <div className="flex h-20 w-20 items-center justify-center rounded-full border-4 border-emerald-400/80">
                <span className="font-display text-xl font-bold text-white">75%</span>
              </div>
              <p className="max-w-sm text-sm leading-relaxed text-slate-400">
                Evidence Coverage from decisive technical checks only. The video testimonial could not be
                checked automatically — it says so, instead of pretending.
              </p>
            </div>
            <div className="mt-4 grid gap-2 text-xs sm:grid-cols-3">
              <div className="rounded-xl border border-white/10 p-3"><p className="font-semibold text-slate-200">CLAIM</p><p className="mt-1 text-slate-500">what the user said</p></div>
              <div className="rounded-xl border border-white/10 p-3"><p className="font-semibold text-slate-200">EVIDENCE</p><p className="mt-1 text-slate-500">what they submitted</p></div>
              <div className="rounded-xl border border-white/10 p-3"><p className="font-semibold text-slate-200">CHECK</p><p className="mt-1 text-slate-500">what Proofly inspected</p></div>
            </div>
          </div>
        )}
        {tab === "Proof page" && (
          <div className="animate-fade-up">
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">The shareable proof</p>
            <div className="mt-3 rounded-xl border border-cyan-400/25 bg-gradient-to-br from-[#0a1120] to-[#050914] p-5">
              <p className="font-display text-sm font-bold tracking-widest text-white">PROOF<span className="text-cyan-400">LY</span> VERIFIED</p>
              <p className="mt-2 font-display text-lg font-semibold text-white">AI-powered bakery website — design &amp; deployment</p>
              <p className="mt-1 font-mono text-xs text-cyan-400/80">PF-7X92K4 · proofly /p/PF-7X92K4</p>
              <p className="mt-3 text-xs text-slate-500">Anyone can open this page. No account needed. QR code included for print &amp; CVs.</p>
            </div>
          </div>
        )}
      </div>
    </GlassCard>
  );
}
