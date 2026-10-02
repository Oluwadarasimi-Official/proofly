import Link from "next/link";
import { redirect } from "next/navigation";
import { supabaseServer, currentUser } from "@/lib/supabase-server";
import { GlassCard, SectionTitle, EmptyState } from "@/components/ui";
import ProofCard from "@/components/ProofCard";

export default async function DashboardPage() {
  const user = await currentUser();
  if (!user) redirect("/login");
  const sb = await supabaseServer();

  const { data: proofs } = await sb
    .from("pf_proofs")
    .select("id, proof_id, title, claim, category, status, visibility, coverage, views_count, completion_date, created_at")
    .eq("owner_id", user.id)
    .order("created_at", { ascending: false });

  const list = proofs ?? [];
  const total = list.length;
  const verified = list.filter((p) => p.status === "VERIFIED").length;
  const pending = list.filter((p) => p.status === "PENDING" || p.status === "DRAFT").length;
  const views = list.reduce((s, p) => s + (p.views_count ?? 0), 0);
  const disputed = list.filter((p) => p.status === "DISPUTED").length;

  const { data: notifs } = await sb
    .from("pf_notifications")
    .select("id, type, title, body, link, read, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(5);

  const stats = [
    { label: "Total proofs", value: total, accent: "text-white" },
    { label: "Verified", value: verified, accent: "text-emerald-300" },
    { label: "In progress", value: pending, accent: "text-amber-300" },
    { label: "Proof views", value: views, accent: "text-cyan-300" },
  ];

  return (
    <div className="animate-fade-up">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold text-white">Dashboard</h1>
          <p className="mt-1 text-sm text-slate-400">Your body of verified work, at a glance.</p>
        </div>
        <Link
          href="/proofs/new"
          className="rounded-xl bg-gradient-to-r from-cyan-400 to-blue-500 px-5 py-2.5 text-sm font-bold text-[#04121a] transition hover:brightness-110"
        >
          + New proof
        </Link>
      </div>

      {disputed > 0 && (
        <Link href="/proofs" className="mt-6 block rounded-2xl border border-orange-400/30 bg-orange-500/10 px-5 py-4">
          <p className="text-sm font-semibold text-orange-300">
            {disputed} proof{disputed > 1 ? "s are" : " is"} disputed
          </p>
          <p className="mt-0.5 text-xs text-orange-200/70">Review the reports and resolve them to restore your proofs.</p>
        </Link>
      )}

      <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((s) => (
          <GlassCard key={s.label} className="p-5">
            <p className={`font-display text-3xl font-bold ${s.accent}`}>{s.value}</p>
            <p className="mt-1 text-xs font-medium uppercase tracking-widest text-slate-500">{s.label}</p>
          </GlassCard>
        ))}
      </div>

      <div className="mt-10 grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <SectionTitle hint="Your most recent proofs">Recent proofs</SectionTitle>
          {list.length === 0 ? (
            <EmptyState
              title="No proofs yet"
              hint="Create your first proof: state a claim, attach evidence, run verification, share the page."
              action={
                <Link href="/proofs/new" className="rounded-xl bg-gradient-to-r from-cyan-400 to-blue-500 px-5 py-2.5 text-sm font-bold text-[#04121a]">
                  Create proof
                </Link>
              }
            />
          ) : (
            <div className="grid gap-4">
              {list.slice(0, 5).map((p) => (
                <ProofCard key={p.id} proof={p} />
              ))}
            </div>
          )}
        </div>
        <div>
          <SectionTitle hint="Latest activity on your proofs">Notifications</SectionTitle>
          {(notifs ?? []).length === 0 ? (
            <GlassCard className="p-5 text-sm text-slate-500">Nothing yet. Verification requests, reviews and dispute reports will appear here.</GlassCard>
          ) : (
            <div className="space-y-3">
              {(notifs ?? []).map((n) => (
                <Link key={n.id} href={n.link ?? "/verify"}>
                  <GlassCard className={`p-4 transition hover:border-cyan-400/30 ${n.read ? "opacity-60" : ""}`}>
                    <p className="text-sm font-semibold text-white">{n.title}</p>
                    {n.body && <p className="mt-1 line-clamp-2 text-xs text-slate-400">{n.body}</p>}
                    <p className="mt-2 text-[11px] text-slate-500">{new Date(n.created_at).toLocaleString()}</p>
                  </GlassCard>
                </Link>
              ))}
              <Link href="/verify" className="block text-center text-sm font-medium text-cyan-300 hover:text-cyan-200">
                Open verification center →
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
