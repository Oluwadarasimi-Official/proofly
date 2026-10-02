"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { GlassCard, SectionTitle, EmptyState, Field, inputCls, btnPrimary } from "@/components/ui";
import ProofCard, { type ProofSummary } from "@/components/ProofCard";
import { CATEGORIES, STATUSES } from "@/lib/site";

export default function MyProofsPage() {
  const [proofs, setProofs] = useState<ProofSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [category, setCategory] = useState("");

  useEffect(() => {
    fetch("/api/proofs")
      .then((r) => r.json())
      .then((d) => setProofs(d.proofs ?? []))
      .finally(() => setLoading(false));
  }, []);

  const filtered = proofs.filter((p) => {
    if (status && p.status !== status) return false;
    if (category && p.category !== category) return false;
    if (q && !`${p.title} ${p.claim} ${p.proof_id}`.toLowerCase().includes(q.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="animate-fade-up">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold text-white">My Proofs</h1>
          <p className="mt-1 text-sm text-slate-400">{proofs.length} proof{proofs.length === 1 ? "" : "s"} in your record.</p>
        </div>
        <Link href="/proofs/new" className={`${btnPrimary}`}>
          + New proof
        </Link>
      </div>

      <GlassCard className="mt-6 grid gap-4 p-5 sm:grid-cols-4">
        <Field label="Search">
          <input value={q} onChange={(e) => setQ(e.target.value)} className={inputCls} placeholder="Title, claim or PF-ID…" />
        </Field>
        <Field label="Status">
          <select value={status} onChange={(e) => setStatus(e.target.value)} className={inputCls}>
            <option value="">All statuses</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </Field>
        <Field label="Category">
          <select value={category} onChange={(e) => setCategory(e.target.value)} className={inputCls}>
            <option value="">All categories</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </Field>
        <div className="flex items-end">
          <button
            onClick={() => { setQ(""); setStatus(""); setCategory(""); }}
            className="w-full rounded-xl border border-white/15 px-4 py-2.5 text-sm text-slate-300 hover:border-cyan-400/40"
          >
            Clear
          </button>
        </div>
      </GlassCard>

      <div className="mt-6">
        {loading ? (
          <p className="text-sm text-slate-500">Loading…</p>
        ) : filtered.length === 0 ? (
          <EmptyState
            title={proofs.length === 0 ? "No proofs yet" : "No proofs match"}
            hint={proofs.length === 0 ? "Create your first proof to start your verifiable record." : "Try clearing the filters."}
            action={proofs.length === 0 ? <Link href="/proofs/new" className={btnPrimary}>Create proof</Link> : undefined}
          />
        ) : (
          <div className="grid gap-4">
            {filtered.map((p) => (
              <ProofCard key={p.id} proof={p} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
