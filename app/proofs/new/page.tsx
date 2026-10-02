"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { GlassCard, Field, inputCls, btnPrimary, btnGhost } from "@/components/ui";
import AiAssist from "@/components/AiAssist";
import { CATEGORIES } from "@/lib/site";

const EVIDENCE_TYPES = [
  { value: "url", label: "URL / link" },
  { value: "live_site", label: "Live website" },
  { value: "github_repo", label: "GitHub repository" },
  { value: "github_commit", label: "GitHub commit" },
  { value: "image", label: "Image upload" },
  { value: "pdf", label: "PDF / document" },
  { value: "video", label: "Video upload" },
  { value: "certificate", label: "Certificate" },
  { value: "file", label: "Other file" },
] as const;

const UPLOAD_TYPES = new Set(["image", "pdf", "video", "certificate", "file"]);

export default function NewProofPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [proofUuid, setProofUuid] = useState("");
  const [proofId, setProofId] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  // Step 1 fields
  const [title, setTitle] = useState("");
  const [claim, setClaim] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("Software");
  const [startDate, setStartDate] = useState("");
  const [completionDate, setCompletionDate] = useState("");
  const [contribution, setContribution] = useState("");
  const [visibility, setVisibility] = useState("public");

  // Step 2 fields
  const [evType, setEvType] = useState<string>("url");
  const [evSource, setEvSource] = useState("");
  const [evDesc, setEvDesc] = useState("");
  const [evVis, setEvVis] = useState("public");
  const [evFile, setEvFile] = useState<File | null>(null);
  const [evidence, setEvidence] = useState<{ id: string; type: string; source: string; description: string | null }[]>([]);

  async function createDraft() {
    setErr("");
    if (!title.trim() || !claim.trim()) {
      setErr("A title and an explicit claim are required.");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/proofs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, claim, description, category, start_date: startDate || null, completion_date: completionDate || null, contribution, visibility }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error ?? "Could not create proof");
      setProofUuid(d.id);
      setProofId(d.proof_id);
      setStep(2);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  async function addEvidence() {
    setErr("");
    setBusy(true);
    try {
      let res: Response;
      if (UPLOAD_TYPES.has(evType)) {
        if (!evFile) throw new Error("Choose a file to upload");
        const form = new FormData();
        form.append("proof_uuid", proofUuid);
        form.append("type", evType);
        form.append("description", evDesc);
        form.append("visibility", evVis);
        form.append("file", evFile);
        res = await fetch("/api/evidence", { method: "POST", body: form });
      } else {
        if (!evSource.trim()) throw new Error("Enter the source URL");
        res = await fetch("/api/evidence", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ proof_uuid: proofUuid, type: evType, source: evSource.trim(), description: evDesc, visibility: evVis }),
        });
      }
      const d = await res.json();
      if (!res.ok) throw new Error(d.error ?? "Could not add evidence");
      setEvidence([...evidence, { id: d.id, type: evType, source: UPLOAD_TYPES.has(evType) ? evFile!.name : evSource.trim(), description: evDesc || null }]);
      setEvSource("");
      setEvDesc("");
      setEvFile(null);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  async function finish() {
    setBusy(true);
    try {
      const res = await fetch(`/api/proofs/${proofUuid}/verify`, { method: "POST" });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error ?? "Verification failed");
      router.push(`/proofs/${proofUuid}`);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed");
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl animate-fade-up">
      <h1 className="font-display text-3xl font-bold text-white">Create proof</h1>
      <div className="mt-4 flex items-center gap-2">
        {["Define claim", "Add evidence", "Verify & publish"].map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <span className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${step > i + 1 ? "bg-emerald-500/20 text-emerald-300" : step === i + 1 ? "bg-cyan-400 text-[#04121a]" : "bg-white/10 text-slate-400"}`}>
              {step > i + 1 ? "✓" : i + 1}
            </span>
            <span className={`text-xs font-medium ${step === i + 1 ? "text-white" : "text-slate-500"} hidden sm:block`}>{s}</span>
            {i < 2 && <span className="mx-1 h-px w-8 bg-white/15 sm:w-14" />}
          </div>
        ))}
      </div>

      {err && <p className="mt-4 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-2.5 text-sm text-rose-300">{err}</p>}

      {step === 1 && (
        <GlassCard className="mt-6 space-y-5 p-6 sm:p-8">
          <Field label="Title">
            <input value={title} onChange={(e) => setTitle(e.target.value)} className={inputCls} placeholder="e.g. AI-powered bakery website" maxLength={160} />
          </Field>
          <div>
            <Field label="Explicit claim" hint="One falsifiable sentence: what exactly did you do?">
              <textarea value={claim} onChange={(e) => setClaim(e.target.value)} className={`${inputCls} min-h-[90px]`} placeholder="I designed and deployed an AI-powered website for a bakery in Lagos." maxLength={2000} />
            </Field>
            <AiAssist mode="summarize_claim" input={{ claim, category, description }} />
          </div>
          <Field label="Description (optional)">
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} className={`${inputCls} min-h-[90px]`} placeholder="More context about the work…" maxLength={5000} />
          </Field>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Category">
              <select value={category} onChange={(e) => setCategory(e.target.value)} className={inputCls}>
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </Field>
            <Field label="Visibility" hint="Public proofs are listed in search and viewable by anyone.">
              <select value={visibility} onChange={(e) => setVisibility(e.target.value)} className={inputCls}>
                <option value="public">Public</option>
                <option value="unlisted">Unlisted (only with the link)</option>
                <option value="private">Private (only you)</option>
              </select>
            </Field>
            <Field label="Start date (optional)">
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className={inputCls} />
            </Field>
            <Field label="Completion date (optional)">
              <input type="date" value={completionDate} onChange={(e) => setCompletionDate(e.target.value)} className={inputCls} />
            </Field>
          </div>
          <Field label="Your personal contribution" hint="What part did YOU do? Be specific.">
            <textarea value={contribution} onChange={(e) => setContribution(e.target.value)} className={`${inputCls} min-h-[70px]`} placeholder="Frontend development, UI design and deployment…" maxLength={2000} />
          </Field>
          <button onClick={createDraft} disabled={busy} className={`${btnPrimary} w-full sm:w-auto`}>
            {busy ? "Creating…" : "Continue to evidence →"}
          </button>
        </GlassCard>
      )}

      {step === 2 && (
        <div className="mt-6 space-y-6">
          <GlassCard className="p-6 sm:p-8">
            <h2 className="font-display text-lg font-semibold text-white">Add evidence <span className="font-mono text-xs text-cyan-400/70">{proofId}</span></h2>
            <p className="mt-1 text-sm text-slate-400">Each item is timestamped. Add as many as you need — you can keep adding after publishing too.</p>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <Field label="Evidence type">
                <select value={evType} onChange={(e) => setEvType(e.target.value)} className={inputCls}>
                  {EVIDENCE_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </Field>
              <Field label="Visibility">
                <select value={evVis} onChange={(e) => setEvVis(e.target.value)} className={inputCls}>
                  <option value="public">Public</option>
                  <option value="private">Private (only you)</option>
                </select>
              </Field>
            </div>
            <div className="mt-4">
              {UPLOAD_TYPES.has(evType) ? (
                <Field label="File" hint="Max 12 MB. Images, PDFs, video and certificates only.">
                  <input type="file" onChange={(e) => setEvFile(e.target.files?.[0] ?? null)} className={`${inputCls} file:mr-3 file:rounded-lg file:border-0 file:bg-cyan-400/20 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-cyan-200`} />
                </Field>
              ) : (
                <Field label="Source URL" hint={evType.startsWith("github") ? "Paste the github.com repo or commit URL." : "Must be reachable — Proofly will actually check it."}>
                  <input value={evSource} onChange={(e) => setEvSource(e.target.value)} className={inputCls} placeholder="https://…" />
                </Field>
              )}
            </div>
            <div className="mt-4">
              <Field label="Description" hint="What does this evidence show?">
                <input value={evDesc} onChange={(e) => setEvDesc(e.target.value)} className={inputCls} placeholder="e.g. Live production deployment" maxLength={1000} />
              </Field>
            </div>
            <button onClick={addEvidence} disabled={busy} className={`${btnGhost} mt-5`}>
              {busy ? "Adding…" : "+ Add evidence"}
            </button>
            <AiAssist mode="suggest_evidence" input={{ claim, category, evidence }} />
          </GlassCard>

          {evidence.length > 0 && (
            <GlassCard className="p-6">
              <h3 className="font-display text-base font-semibold text-white">{evidence.length} evidence item{evidence.length > 1 ? "s" : ""} attached</h3>
              <ul className="mt-3 space-y-2">
                {evidence.map((e) => (
                  <li key={e.id} className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2.5">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-white">{EVIDENCE_TYPES.find((t) => t.value === e.type)?.label}</p>
                      <p className="truncate font-mono text-xs text-slate-500">{e.source}</p>
                    </div>
                    <span className="shrink-0 text-emerald-300">✓</span>
                  </li>
                ))}
              </ul>
            </GlassCard>
          )}

          <div className="flex flex-col gap-3 sm:flex-row">
            <button onClick={finish} disabled={busy} className={`${btnPrimary} flex-1`}>
              {busy ? "Running verification…" : evidence.length === 0 ? "Skip evidence & finish →" : "Run verification & finish →"}
            </button>
            <Link href={`/proofs/${proofUuid}`} className={`${btnGhost}`}>
              Manage later
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
