"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase-browser";
import { GlassCard, SectionTitle, Field, inputCls, btnPrimary, btnDanger } from "@/components/ui";

export default function SettingsPage() {
  const router = useRouter();
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  async function changePassword(e: React.FormEvent) {
    e.preventDefault();
    setMsg("");
    if (pw.length < 6) {
      setMsg("Password must be at least 6 characters.");
      return;
    }
    if (pw !== pw2) {
      setMsg("Passwords do not match.");
      return;
    }
    setBusy(true);
    try {
      const { error } = await supabaseBrowser().auth.updateUser({ password: pw });
      if (error) throw error;
      setMsg("Password updated ✓");
      setPw("");
      setPw2("");
    } catch (e2) {
      setMsg(e2 instanceof Error ? e2.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  async function signOut() {
    await supabaseBrowser().auth.signOut();
    router.push("/");
    router.refresh();
  }

  return (
    <div className="mx-auto max-w-2xl animate-fade-up">
      <h1 className="font-display text-3xl font-bold text-white">Settings</h1>
      <p className="mt-1 text-sm text-slate-400">Account security and session.</p>

      <div className="mt-8">
        <SectionTitle>Change password</SectionTitle>
        <GlassCard className="p-6">
          <form onSubmit={changePassword} className="space-y-4">
            <Field label="New password">
              <input type="password" value={pw} onChange={(e) => setPw(e.target.value)} className={inputCls} minLength={6} required />
            </Field>
            <Field label="Confirm new password">
              <input type="password" value={pw2} onChange={(e) => setPw2(e.target.value)} className={inputCls} minLength={6} required />
            </Field>
            {msg && <p className={`text-sm ${msg.includes("✓") ? "text-emerald-300" : "text-rose-300"}`}>{msg}</p>}
            <button type="submit" disabled={busy} className={btnPrimary}>
              {busy ? "Updating…" : "Update password"}
            </button>
          </form>
        </GlassCard>
      </div>

      <div className="mt-8">
        <SectionTitle>Session</SectionTitle>
        <GlassCard className="flex items-center justify-between gap-4 p-6">
          <p className="text-sm text-slate-400">Sign out of Proofly on this device.</p>
          <button onClick={signOut} className={btnDanger}>Sign out</button>
        </GlassCard>
      </div>
    </div>
  );
}
