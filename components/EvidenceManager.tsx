"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Field, inputCls, btnGhost } from "./ui";

const TYPES = [
  { value: "url", label: "URL / link", upload: false },
  { value: "live_site", label: "Live website", upload: false },
  { value: "github_repo", label: "GitHub repository", upload: false },
  { value: "github_commit", label: "GitHub commit", upload: false },
  { value: "image", label: "Image upload", upload: true },
  { value: "pdf", label: "PDF / document", upload: true },
  { value: "video", label: "Video upload", upload: true },
  { value: "certificate", label: "Certificate", upload: true },
  { value: "file", label: "Other file", upload: true },
];

export interface EvItem {
  id: string;
  type: string;
  source: string;
  description: string | null;
  file_name: string | null;
  visibility: string;
  created_at: string;
}

export default function EvidenceManager({ proofUuid, initial }: { proofUuid: string; initial: EvItem[] }) {
  const router = useRouter();
  const [items, setItems] = useState(initial);
  const [type, setType] = useState("url");
  const [source, setSource] = useState("");
  const [description, setDescription] = useState("");
  const [visibility, setVisibility] = useState("public");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const isUpload = TYPES.find((t) => t.value === type)?.upload;

  async function add() {
    setErr("");
    setBusy(true);
    try {
      let res: Response;
      if (isUpload) {
        if (!file) throw new Error("Choose a file");
        const form = new FormData();
        form.append("proof_uuid", proofUuid);
        form.append("type", type);
        form.append("description", description);
        form.append("visibility", visibility);
        form.append("file", file);
        res = await fetch("/api/evidence", { method: "POST", body: form });
      } else {
        if (!source.trim()) throw new Error("Enter the source URL");
        res = await fetch("/api/evidence", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ proof_uuid: proofUuid, type, source: source.trim(), description, visibility }),
        });
      }
      const d = await res.json();
      if (!res.ok) throw new Error(d.error ?? "Failed");
      setSource("");
      setDescription("");
      setFile(null);
      router.refresh();
      // Re-fetch fresh list
      const r2 = await fetch(`/api/proofs/${proofUuid}`);
      const d2 = await r2.json();
      if (d2.evidence) setItems(d2.evidence);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    if (!confirm("Remove this evidence item?")) return;
    const res = await fetch(`/api/evidence/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      alert(d.error ?? "Failed");
      return;
    }
    setItems(items.filter((i) => i.id !== id));
    router.refresh();
  }

  return (
    <div>
      <div className="space-y-2">
        {items.length === 0 && <p className="text-sm text-slate-500">No evidence yet — add the first item below.</p>}
        {items.map((e) => (
          <div key={e.id} className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3">
            <div className="min-w-0">
              <p className="text-sm font-medium text-white">
                {TYPES.find((t) => t.value === e.type)?.label ?? e.type}
                {e.visibility === "private" && <span className="ml-2 rounded bg-white/10 px-1.5 py-0.5 text-[10px] uppercase tracking-wider text-slate-400">private</span>}
              </p>
              <p className="truncate font-mono text-xs text-slate-500">{e.file_name ?? e.source}</p>
              {e.description && <p className="mt-0.5 text-xs text-slate-400">{e.description}</p>}
            </div>
            <button onClick={() => remove(e.id)} className="shrink-0 rounded-lg px-2 py-1 text-xs text-rose-300 hover:bg-rose-500/10">
              Remove
            </button>
          </div>
        ))}
      </div>

      <div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.02] p-5">
        <p className="font-display text-sm font-semibold text-white">Add evidence</p>
        {err && <p className="mt-2 text-sm text-rose-300">{err}</p>}
        <div className="mt-3 grid gap-4 sm:grid-cols-2">
          <Field label="Type">
            <select value={type} onChange={(e) => setType(e.target.value)} className={inputCls}>
              {TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </Field>
          <Field label="Visibility">
            <select value={visibility} onChange={(e) => setVisibility(e.target.value)} className={inputCls}>
              <option value="public">Public</option>
              <option value="private">Private (only you)</option>
            </select>
          </Field>
        </div>
        <div className="mt-4">
          {isUpload ? (
            <Field label="File" hint="Max 12 MB.">
              <input type="file" onChange={(e) => setFile(e.target.files?.[0] ?? null)} className={`${inputCls} file:mr-3 file:rounded-lg file:border-0 file:bg-cyan-400/20 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-cyan-200`} />
            </Field>
          ) : (
            <Field label="Source URL">
              <input value={source} onChange={(e) => setSource(e.target.value)} className={inputCls} placeholder="https://…" />
            </Field>
          )}
        </div>
        <div className="mt-4">
          <Field label="Description">
            <input value={description} onChange={(e) => setDescription(e.target.value)} className={inputCls} placeholder="What does this show?" maxLength={1000} />
          </Field>
        </div>
        <button onClick={add} disabled={busy} className={`${btnGhost} mt-4`}>
          {busy ? "Adding…" : "+ Add evidence"}
        </button>
      </div>
    </div>
  );
}
