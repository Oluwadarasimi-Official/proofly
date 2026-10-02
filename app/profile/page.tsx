"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { GlassCard, Field, inputCls, btnPrimary } from "@/components/ui";
import { CopyLinkButton } from "@/components/proof-actions";

export default function ProfilePage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [f, setF] = useState({ username: "", name: "", bio: "", organization: "", website: "", x: "", linkedin: "", github: "", instagram: "" });

  useEffect(() => {
    fetch("/api/profile")
      .then((r) => r.json())
      .then((d) => {
        const p = d.profile ?? {};
        const sl = p.social_links ?? {};
        setF({
          username: p.username ?? "",
          name: p.name ?? "",
          bio: p.bio ?? "",
          organization: p.organization ?? "",
          website: p.website ?? "",
          x: sl.x ?? "",
          linkedin: sl.linkedin ?? "",
          github: sl.github ?? "",
          instagram: sl.instagram ?? "",
        });
        setLoading(false);
      });
  }, []);

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setF({ ...f, [k]: e.target.value });

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMsg("");
    try {
      const r = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: f.username, name: f.name, bio: f.bio, organization: f.organization, website: f.website,
          social_links: { x: f.x, linkedin: f.linkedin, github: f.github, instagram: f.instagram },
        }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error ?? "Failed");
      setMsg("Profile saved ✓");
    } catch (e2) {
      setMsg(e2 instanceof Error ? e2.message : "Failed");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <p className="text-sm text-slate-500">Loading…</p>;

  return (
    <div className="mx-auto max-w-2xl animate-fade-up">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold text-white">Profile</h1>
          <p className="mt-1 text-sm text-slate-400">This is what the world sees on your public page.</p>
        </div>
        {f.username && (
          <div className="flex items-center gap-2">
            <Link href={`/@${f.username}`} className="text-sm font-medium text-cyan-300 hover:underline">View public profile →</Link>
            <CopyLinkButton url={`${typeof window !== "undefined" ? window.location.origin : ""}/@${f.username}`} label="Copy" />
          </div>
        )}
      </div>

      <GlassCard className="mt-6 p-6 sm:p-8">
        <form onSubmit={save} className="space-y-5">
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Username" hint="Letters, numbers, underscores.">
              <input value={f.username} onChange={set("username")} className={inputCls} required minLength={3} />
            </Field>
            <Field label="Display name">
              <input value={f.name} onChange={set("name")} className={inputCls} />
            </Field>
          </div>
          <Field label="Bio">
            <textarea value={f.bio} onChange={set("bio")} className={`${inputCls} min-h-[90px]`} maxLength={500} placeholder="What do you do?" />
          </Field>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Organization / school">
              <input value={f.organization} onChange={set("organization")} className={inputCls} />
            </Field>
            <Field label="Website">
              <input value={f.website} onChange={set("website")} className={inputCls} placeholder="https://…" />
            </Field>
          </div>
          <div>
            <p className="mb-3 text-sm font-medium text-slate-200">Social links</p>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="X"><input value={f.x} onChange={set("x")} className={inputCls} placeholder="https://x.com/…" /></Field>
              <Field label="LinkedIn"><input value={f.linkedin} onChange={set("linkedin")} className={inputCls} placeholder="https://linkedin.com/in/…" /></Field>
              <Field label="GitHub"><input value={f.github} onChange={set("github")} className={inputCls} placeholder="https://github.com/…" /></Field>
              <Field label="Instagram"><input value={f.instagram} onChange={set("instagram")} className={inputCls} placeholder="https://instagram.com/…" /></Field>
            </div>
          </div>
          {msg && <p className={`text-sm ${msg.includes("✓") ? "text-emerald-300" : "text-rose-300"}`}>{msg}</p>}
          <button type="submit" disabled={saving} className={`${btnPrimary} w-full sm:w-auto`}>
            {saving ? "Saving…" : "Save profile"}
          </button>
        </form>
      </GlassCard>
    </div>
  );
}
