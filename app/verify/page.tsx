import { redirect } from "next/navigation";
import Link from "next/link";
import { supabaseServer, currentUser } from "@/lib/supabase-server";
import { GlassCard, SectionTitle, EmptyState } from "@/components/ui";
import { ResolveRequestButtons } from "@/components/proof-actions";
import NotificationsPanel from "@/components/NotificationsPanel";

export default async function VerifyPage() {
  const user = await currentUser();
  if (!user) redirect("/login");
  const sb = await supabaseServer();

  const [{ data: incoming }, { data: outgoing }] = await Promise.all([
    sb.from("pf_verification_requests").select("*").eq("verifier_id", user.id).order("created_at", { ascending: false }),
    sb.from("pf_verification_requests").select("*").eq("requester_id", user.id).order("created_at", { ascending: false }),
  ]);

  const proofIds = [...new Set([...(incoming ?? []), ...(outgoing ?? [])].map((r) => r.proof_id))];
  let proofMap: Record<string, { id: string; proof_id: string; title: string; status: string }> = {};
  if (proofIds.length) {
    const { data: proofs } = await sb.from("pf_proofs").select("id, proof_id, title, status").in("id", proofIds);
    proofMap = Object.fromEntries((proofs ?? []).map((p) => [p.id, p]));
  }
  const requesterIds = [...new Set((incoming ?? []).map((r) => r.requester_id))];
  let requesterMap: Record<string, string> = {};
  if (requesterIds.length) {
    const { data: profs } = await sb.from("pf_profiles").select("id, username, name").in("id", requesterIds);
    requesterMap = Object.fromEntries((profs ?? []).map((p) => [p.id, p.name ?? (p.username ? `@${p.username}` : "Someone")]));
  }
  const verifierIds = [...new Set((outgoing ?? []).map((r) => r.verifier_id).filter(Boolean))];
  let verifierMap: Record<string, string> = {};
  if (verifierIds.length) {
    const { data: profs } = await sb.from("pf_profiles").select("id, username, name").in("id", verifierIds);
    verifierMap = Object.fromEntries((profs ?? []).map((p) => [p.id, p.name ?? (p.username ? `@${p.username}` : "verifier")]));
  }

  return (
    <div className="animate-fade-up">
      <h1 className="font-display text-3xl font-bold text-white">Verification center</h1>
      <p className="mt-1 text-sm text-slate-400">Human verification requests, reviews and notifications.</p>

      <div className="mt-8 grid gap-8 lg:grid-cols-2">
        <div>
          <SectionTitle hint="Other people asked YOU to verify their work.">Requests to me ({(incoming ?? []).filter((r) => r.status === "pending").length} pending)</SectionTitle>
          {(incoming ?? []).length === 0 ? (
            <EmptyState title="No requests" hint="When someone asks you to verify their proof, it appears here." />
          ) : (
            <div className="space-y-4">
              {(incoming ?? []).map((r) => {
                const p = proofMap[r.proof_id];
                return (
                  <GlassCard key={r.id} className="p-5">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-display text-base font-semibold text-white">{p?.title ?? "Proof"}</p>
                      <span className={`rounded-full px-2.5 py-0.5 text-[11px] uppercase tracking-wider ${r.status === "pending" ? "bg-amber-500/15 text-amber-300" : "bg-white/5 text-slate-400"}`}>
                        {r.status.replace("_", " ")}
                      </span>
                    </div>
                    <p className="mt-1 font-mono text-xs text-cyan-400/70">{p?.proof_id}</p>
                    <p className="mt-2 text-sm text-slate-400">
                      Requested by <span className="text-slate-200">{requesterMap[r.requester_id] ?? "someone"}</span>
                      {r.message && <span className="text-slate-500"> — “{r.message}”</span>}
                    </p>
                    {p && (
                      <Link href={`/p/${p.proof_id}`} target="_blank" className="mt-2 inline-block text-xs font-medium text-cyan-300 hover:underline">
                        Open the proof page ↗
                      </Link>
                    )}
                    {r.status === "pending" && (
                      <div className="mt-4 border-t border-white/5 pt-4">
                        <p className="mb-2 text-xs text-slate-500">Review the evidence on the proof page, then decide:</p>
                        <ResolveRequestButtons requestId={r.id} />
                      </div>
                    )}
                  </GlassCard>
                );
              })}
            </div>
          )}
        </div>

        <div className="space-y-8">
          <div>
            <SectionTitle hint="Verification you requested from others.">My requests ({(outgoing ?? []).length})</SectionTitle>
            {(outgoing ?? []).length === 0 ? (
              <GlassCard className="p-5 text-sm text-slate-500">You haven&apos;t requested human verification yet. Open any of your proofs and ask someone who saw the work.</GlassCard>
            ) : (
              <div className="space-y-3">
                {(outgoing ?? []).map((r) => {
                  const p = proofMap[r.proof_id];
                  return (
                    <GlassCard key={r.id} className="flex items-center justify-between gap-3 p-4">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-white">{p?.title ?? "Proof"}</p>
                        <p className="text-xs text-slate-500">→ {r.verifier_id ? verifierMap[r.verifier_id] ?? "verifier" : "—"}</p>
                      </div>
                      <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-[11px] uppercase tracking-wider ${r.status === "pending" ? "bg-amber-500/15 text-amber-300" : r.status === "verified" ? "bg-emerald-500/15 text-emerald-300" : "bg-white/5 text-slate-400"}`}>
                        {r.status.replace("_", " ")}
                      </span>
                    </GlassCard>
                  );
                })}
              </div>
            )}
          </div>
          <div>
            <SectionTitle>Notifications</SectionTitle>
            <NotificationsPanel />
          </div>
        </div>
      </div>
    </div>
  );
}
