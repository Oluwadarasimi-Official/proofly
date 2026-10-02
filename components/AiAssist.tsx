"use client";

import { useEffect, useState } from "react";

const LABELS: Record<string, string> = {
  summarize_claim: "AI: tighten my claim",
  analyze_evidence: "AI: analyze evidence",
  suggest_evidence: "AI: suggest missing evidence",
  flag_inconsistencies: "AI: check for inconsistencies",
};

/** Renders nothing at all when AI is not configured server-side. */
export default function AiAssist({ mode, input }: { mode: string; input: Record<string, unknown> }) {
  const [enabled, setEnabled] = useState(false);
  const [checked, setChecked] = useState(false);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [disclaimer, setDisclaimer] = useState("");

  useEffect(() => {
    fetch("/api/ai/status")
      .then((r) => r.json())
      .then((d) => setEnabled(Boolean(d.enabled)))
      .finally(() => setChecked(true));
  }, []);

  if (!checked || !enabled) return null;

  async function run() {
    setBusy(true);
    setResult(null);
    try {
      const res = await fetch("/api/ai/assist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode, ...input }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error ?? "AI request failed");
      setResult(d.result);
      setDisclaimer(d.disclaimer ?? "");
    } catch (e) {
      setResult(`AI unavailable: ${e instanceof Error ? e.message : "error"}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-3">
      <button
        type="button"
        onClick={run}
        disabled={busy}
        className="rounded-lg border border-violet-400/30 bg-violet-500/10 px-3 py-1.5 text-xs font-medium text-violet-300 transition hover:bg-violet-500/20 disabled:opacity-50"
      >
        {busy ? "Thinking…" : LABELS[mode] ?? "AI assist"}
      </button>
      {result && (
        <div className="mt-2 rounded-xl border border-violet-400/20 bg-violet-500/[0.07] p-3">
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-200">{result}</p>
          {disclaimer && <p className="mt-2 text-[11px] italic text-slate-500">{disclaimer}</p>}
        </div>
      )}
    </div>
  );
}
