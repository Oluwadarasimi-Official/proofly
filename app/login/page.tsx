"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase-browser";
import { GlassCard, Field, inputCls, btnPrimary } from "@/components/ui";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    setBusy(true);
    try {
      const sb = supabaseBrowser();
      const { error } = await sb.auth.signInWithPassword({ email: email.trim(), password });
      if (error) throw error;
      router.push("/dashboard");
      router.refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Sign in failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-md pt-10">
      <GlassCard className="p-8">
        <h1 className="font-display text-2xl font-bold text-white">Welcome back</h1>
        <p className="mt-1 text-sm text-slate-400">Sign in to keep proving your work.</p>
        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <Field label="Email">
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className={inputCls} placeholder="you@example.com" />
          </Field>
          <Field label="Password">
            <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className={inputCls} placeholder="••••••••" />
          </Field>
          {err && <p className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-2.5 text-sm text-rose-300">{err}</p>}
          <button type="submit" disabled={busy} className={`${btnPrimary} w-full`}>
            {busy ? "Signing in…" : "Sign in"}
          </button>
        </form>
        <p className="mt-6 text-center text-sm text-slate-400">
          New to Proofly?{" "}
          <Link href="/signup" className="font-medium text-cyan-300 hover:text-cyan-200">
            Create an account
          </Link>
        </p>
      </GlassCard>
    </div>
  );
}
