"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { GlassCard, Field, inputCls, btnGhost } from "@/components/ui";
import ProofCard, { type ProofSummary } from "@/components/ProofCard";

export default function CollectionDetailClient({ collectionId }: { collectionId: string }) {
  const router = useRouter();
  const [proofs, setProofs] = useState<ProofSummary[]>([]);
  const [mine, setMine] = useState<ProofSummary[]>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [visibility, setVisibility] = useState("public");
  const [addId, setAddId] = useState("");
  const [loading, setLoading] = useState(true);

  async function load() {
    const [cRes, pRes] = await Promise.all([fetch(`/api/collections/${collectionId}`), fetch("/api/proofs")]);
    const c = await cRes.json();
    const p = await pRes.json();
    if (c.collection) {
      setTitle(c.collection.title);
      setDescription(c.collection.description ?? "");
      setVisibility(c.collection.visibility);
    }
    setProofs(c.proofs ?? []);
    const inIds = new Set((c.proofs ?? []).map((x: ProofSummary) => x.id));
    setMine((p.proofs ?? []).filter((x: ProofSummary) => !inIds.has(x.id)));
    setLoading(false);
  }
  useEffect(() => { load(); }, [collectionId]);

  async function save() {
    await fetch(`/api/collections/${collectionId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, description, visibility }),
    });
    router.refresh();
  }

  async function add() {
    if (!addId) return;
    await fetch(`/api/collections/${collectionId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "add", proof_uuid: addId }),
    });
    setAddId("");
    load();
  }

  async function remove(proofUuid: string) {
    await fetch(`/api/collections/${collectionId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "remove", proof_uuid: proofUuid }),
    });
    load();
  }

  if (loading) return <p className="text-sm text-slate-500">Loading…</p>;

  return (
    <div className="grid gap-8 lg:grid-cols-3">
      <div className="lg:col-span-2 space-y-6">
        <div className="grid gap-4">
          {proofs.length === 0 && <GlassCard className="p-6 text-sm text-slate-500">No proofs in this collection yet — add one from your proofs.</GlassCard>}
          {proofs.map((p) => (
            <div key={p.id} className="relative">
              <ProofCard proof={p} />
              <button onClick={() => remove(p.id)} className="absolute right-3 top-3 rounded-lg bg-black/40 px-2 py-1 text-[11px] text-slate-400 hover:text-rose-300">
                Remove
              </button>
            </div>
          ))}
        </div>
      </div>
      <div className="space-y-6">
        <GlassCard className="space-y-4 p-6">
          <p className="font-display text-sm font-semibold text-white">Edit collection</p>
          <Field label="Title"><input value={title} onChange={(e) => setTitle(e.target.value)} className={inputCls} /></Field>
          <Field label="Description"><textarea value={description} onChange={(e) => setDescription(e.target.value)} className={`${inputCls} min-h-[70px]`} /></Field>
          <Field label="Visibility">
            <select value={visibility} onChange={(e) => setVisibility(e.target.value)} className={inputCls}>
              <option value="public">Public</option>
              <option value="private">Private</option>
            </select>
          </Field>
          <button onClick={save} className={`${btnGhost} w-full`}>Save</button>
        </GlassCard>
        <GlassCard className="space-y-4 p-6">
          <p className="font-display text-sm font-semibold text-white">Add a proof</p>
          {mine.length === 0 ? (
            <p className="text-sm text-slate-500">All your proofs are already in this collection.</p>
          ) : (
            <>
              <Field label="Your proofs">
                <select value={addId} onChange={(e) => setAddId(e.target.value)} className={inputCls}>
                  <option value="">Choose…</option>
                  {mine.map((p) => <option key={p.id} value={p.id}>{p.proof_id} — {p.title}</option>)}
                </select>
              </Field>
              <button onClick={add} disabled={!addId} className={`${btnGhost} w-full`}>Add to collection</button>
            </>
          )}
        </GlassCard>
      </div>
    </div>
  );
}
