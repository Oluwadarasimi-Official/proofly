"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase-browser";
import { GlassCard, Field, inputCls, btnPrimary } from "@/components/ui";

export default function SignupPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    const clean = username.trim().toLowerCase().replace(/[^a-z0-9_]/g, "");
    if (clean.length < 3) {
      setErr("Username must be at least 3 characters (letters, numbers, underscores).");
      return;
    }
    setBusy(true);
    try {
      const sb = supabaseBrowser();
      // Username must be unique.
      const { data: taken } = await sb.from("pf_profiles").select("id").eq("username", clean).maybeSingle();
      if (taken) throw new Error("That username is taken — try another.");
      const { data, error } = await sb.auth.signUp({ email: email.trim(), password });
      if (error) throw error;
      const user = data.user;
      if (!user) throw new Error("Signup did not return a user. Please try signing in.");
      const { error: pErr } = await sb.from("pf_profiles").insert({
        id: user.id,
        username: clean,
        name: name.trim() || clean,
      });
      if (pErr) throw pErr;
      router.push("/dashboard");
      router.refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Signup failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-md pt-10">
      <GlassCard className="p-8">
        <h1 className="font-display text-2xl font-bold text-white">Create your account</h1>
        <p className="mt-1 text-sm text-slate-400">Start building verifiable proof of your work.</p>
        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <Field label="Display name">
            <input value={name} onChange={(e) => setName(e.target.value)} className={inputCls} placeholder="Adaeze Okafor" required />
          </Field>
          <Field label="Username" hint="Your public profile will live at proofly/@username">
            <input value={username} onChange={(e) => setUsername(e.target.value)} className={inputCls} placeholder="adaeze" required />
          </Field>
          <Field label="Email">
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputCls} placeholder="you@example.com" required />
          </Field>
          <Field label="Password" hint="At least 6 characters">
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className={inputCls} placeholder="••••••••" required minLength={6} />
          </Field>
          {err && <p className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-2.5 text-sm text-rose-300">{err}</p>}
          <button type="submit" disabled={busy} className={`${btnPrimary} w-full`}>
            {busy ? "Creating account…" : "Create account"}
          </button>
        </form>
        <p className="mt-6 text-center text-sm text-slate-400">
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-cyan-300 hover:text-cyan-200">
            Sign in
          </Link>
        </p>
      </GlassCard>
    </div>
  );
}
