"use client";

import { useCallback, useState } from "react";
import { GlassCard, SectionTitle, EmptyState, Field, inputCls } from "@/components/ui";
import ProofCard, { type ProofSummary } from "@/components/ProofCard";
import { CATEGORIES, STATUSES } from "@/lib/site";

export default function SearchPage() {
  const [q, setQ] = useState("");
  const [category, setCategory] = useState("");
  const [status, setStatus] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [results, setResults] = useState<ProofSummary[]>([]);
  const [searched, setSearched] = useState(false);
  const [busy, setBusy] = useState(false);

  const run = useCallback(async () => {
    setBusy(true);
    try {
      const params = new URLSearchParams();
      if (q.trim()) params.set("q", q.trim());
      if (category) params.set("category", category);
      if (status) params.set("status", status);
      if (from) params.set("from", from);
      if (to) params.set("to", to);
      const r = await fetch(`/api/search?${params.toString()}`);
      const d = await r.json();
      setResults(d.proofs ?? []);
      setSearched(true);
    } finally {
      setBusy(false);
    }
  }, [q, category, status, from, to]);

  return (
    <div className="animate-fade-up">
      <h1 className="font-display text-3xl font-bold text-white">Search proofs</h1>
      <p className="mt-1 text-sm text-slate-400">Search public proofs by Proof ID, title, username or category.</p>

      <GlassCard className="mt-6 p-5">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Keywords / Proof ID / @username">
            <input value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === "Enter" && run()} className={inputCls} placeholder="PF-XXXXXX, title, username…" />
          </Field>
          <Field label="Category">
            <select value={category} onChange={(e) => setCategory(e.target.value)} className={inputCls}>
              <option value="">All categories</option>
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </Field>
          <Field label="Verification status">
            <select value={status} onChange={(e) => setStatus(e.target.value)} className={inputCls}>
              <option value="">All statuses</option>
              {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </Field>
          <Field label="From date">
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className={inputCls} />
          </Field>
          <Field label="To date">
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className={inputCls} />
          </Field>
          <div className="flex items-end gap-2">
            <button onClick={run} disabled={busy} className="flex-1 rounded-xl bg-gradient-to-r from-cyan-400 to-blue-500 px-5 py-2.5 text-sm font-bold text-[#04121a] hover:brightness-110 disabled:opacity-50">
              {busy ? "Searching…" : "Search"}
            </button>
            <button onClick={() => { setQ(""); setCategory(""); setStatus(""); setFrom(""); setTo(""); setResults([]); setSearched(false); }} className="rounded-xl border border-white/15 px-4 py-2.5 text-sm text-slate-300 hover:border-cyan-400/40">
              Clear
            </button>
          </div>
        </div>
      </GlassCard>

      <div className="mt-6">
        {!searched ? (
          <EmptyState title="Find verifiable work" hint="Try a Proof ID like PF-7X92K4, a skill, or a username." />
        ) : results.length === 0 ? (
          <EmptyState title="No proofs found" hint="Try different keywords or loosen the filters." />
        ) : (
          <>
            <SectionTitle hint={`${results.length} result${results.length === 1 ? "" : "s"}`}>Results</SectionTitle>
            <div className="grid gap-4">
              {results.map((p) => (
                <ProofCard key={p.id} proof={p} publicProof />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
