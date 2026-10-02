"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { GlassCard, SectionTitle, EmptyState, Field, inputCls, btnPrimary } from "@/components/ui";

interface Col { id: string; title: string; description: string | null; visibility: string; proof_count: number; }

export default function CollectionsPage() {
  const [cols, setCols] = useState<Col[]>([]);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [visibility, setVisibility] = useState("public");
  const [busy, setBusy] = useState(false);

  async function load() {
    const r = await fetch("/api/collections");
    const d = await r.json();
    setCols(d.collections ?? []);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setBusy(true);
    const r = await fetch("/api/collections", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, description, visibility }),
    });
    if (r.ok) {
      setTitle("");
      setDescription("");
      load();
    }
    setBusy(false);
  }

  async function remove(id: string) {
    if (!confirm("Delete this collection? (Proofs are kept.)")) return;
    await fetch(`/api/collections/${id}`, { method: "DELETE" });
    load();
  }

  return (
    <div className="animate-fade-up">
      <h1 className="font-display text-3xl font-bold text-white">Collections</h1>
      <p className="mt-1 text-sm text-slate-400">Group proofs — “2026 Projects”, “Hackathons”, “Open Source”…</p>

      <div className="mt-8 grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <SectionTitle>Your collections ({cols.length})</SectionTitle>
          {loading ? <p className="text-sm text-slate-500">Loading…</p> :
            cols.length === 0 ? (
              <EmptyState title="No collections" hint="Create one to start grouping related proofs." />
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                {cols.map((c) => (
                  <GlassCard key={c.id} className="p-5">
                    <div className="flex items-start justify-between gap-2">
                      <Link href={`/collections/${c.id}`} className="font-display text-base font-semibold text-white hover:text-cyan-200">
                        {c.title}
                      </Link>
                      <button onClick={() => remove(c.id)} className="text-xs text-slate-500 hover:text-rose-300">Delete</button>
                    </div>
                    {c.description && <p className="mt-1 line-clamp-2 text-sm text-slate-400">{c.description}</p>}
                    <p className="mt-3 text-xs text-slate-500">{c.proof_count} proof{c.proof_count === 1 ? "" : "s"} · {c.visibility}</p>
                  </GlassCard>
                ))}
              </div>
            )}
        </div>
        <div>
          <SectionTitle>New collection</SectionTitle>
          <GlassCard className="p-6">
            <form onSubmit={create} className="space-y-4">
              <Field label="Title">
                <input value={title} onChange={(e) => setTitle(e.target.value)} className={inputCls} placeholder="2026 Projects" required maxLength={120} />
              </Field>
              <Field label="Description (optional)">
                <textarea value={description} onChange={(e) => setDescription(e.target.value)} className={`${inputCls} min-h-[70px]`} maxLength={1000} />
              </Field>
              <Field label="Visibility">
                <select value={visibility} onChange={(e) => setVisibility(e.target.value)} className={inputCls}>
                  <option value="public">Public</option>
                  <option value="private">Private</option>
                </select>
              </Field>
              <button type="submit" disabled={busy} className={`${btnPrimary} w-full`}>{busy ? "Creating…" : "Create collection"}</button>
            </form>
          </GlassCard>
        </div>
      </div>
    </div>
  );
}
