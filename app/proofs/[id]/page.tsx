import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { supabaseServer, currentUser } from "@/lib/supabase-server";
import { proofPublicUrl, qrDataUrl } from "@/lib/site";
import { GlassCard, StatusBadge, SectionTitle, CoverageRing, CheckIcon } from "@/components/ui";
import SnapshotCard from "@/components/SnapshotCard";
import EvidenceManager from "@/components/EvidenceManager";
import {
  RunVerificationButton, RevokeButton, DeleteProofButton, CopyLinkButton,
  RequestVerifierForm, ResolveDisputeButtons, DisputeForm, EditProofForm, AiAssist,
} from "@/components/proof-actions";

type Ctx = { params: Promise<{ id: string }> };

export default async function ManageProofPage({ params }: Ctx) {
  const { id } = await params;
  const user = await currentUser();
  if (!user) redirect("/login");
  const sb = await supabaseServer();

  const { data: proof } = await sb.from("pf_proofs").select("*").eq("id", id).eq("owner_id", user.id).maybeSingle();
  if (!proof) notFound();

  const [{ data: evidence }, { data: checks }, { data: events }, { data: vreqs }, { data: disputes }, { data: prof }] = await Promise.all([
    sb.from("pf_evidence").select("*").eq("proof_id", id).order("created_at", { ascending: true }),
    sb.from("pf_verification_checks").select("*").eq("proof_id", id).order("checked_at", { ascending: false }).limit(60),
    sb.from("pf_proof_events").select("*").eq("proof_id", id).order("created_at", { ascending: false }).limit(30),
    sb.from("pf_verification_requests").select("*").eq("proof_id", id).order("created_at", { ascending: false }),
    sb.from("pf_disputes").select("*").eq("proof_id", id).order("created_at", { ascending: false }),
    sb.from("pf_profiles").select("username, name").eq("id", user.id).maybeSingle(),
  ]);

  const reqIds = (vreqs ?? []).map((r) => r.id);
  let reviews: Record<string, { action: string; comment: string | null; created_at: string }[]> = {};
  if (reqIds.length) {
    const { data: revs } = await sb.from("pf_verification_reviews").select("*").in("request_id", reqIds).order("created_at", { ascending: true });
    for (const r of revs ?? []) {
      reviews[r.request_id] = [...(reviews[r.request_id] ?? []), r];
    }
  }
  const verifierIds = [...new Set((vreqs ?? []).map((r) => r.verifier_id).filter(Boolean))];
  let verifierNames: Record<string, string> = {};
  if (verifierIds.length) {
    const { data: vps } = await sb.from("pf_profiles").select("id, username, name").in("id", verifierIds);
    verifierNames = Object.fromEntries((vps ?? []).map((p) => [p.id, p.name ?? (p.username ? `@${p.username}` : "verifier")]));
  }

  const publicUrl = proofPublicUrl(proof.proof_id);
  const creator = (prof as { name?: string | null; username?: string | null } | null)?.name ?? "Proofly user";
  const latestCheckAt = checks?.[0]?.checked_at ? new Date(checks[0].checked_at).toLocaleString() : null;
  const openDisputes = (disputes ?? []).filter((d) => d.status === "open");

  return (
    <div className="animate-fade-up">
      <Link href="/proofs" className="text-sm text-slate-400 hover:text-cyan-300">← My Proofs</Link>

      <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="font-mono text-xs tracking-wider text-cyan-400/80">{proof.proof_id}</p>
          <h1 className="mt-1 font-display text-3xl font-bold text-white">{proof.title}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <StatusBadge status={proof.status} />
            <span className="rounded-md bg-white/5 px-2 py-1 text-xs text-slate-400">{proof.category}</span>
            <span className="rounded-md bg-white/5 px-2 py-1 text-xs text-slate-400 capitalize">{proof.visibility}</span>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {proof.status !== "REVOKED" && <RunVerificationButton proofUuid={id} />}
          <EditProofForm proof={proof} />
          {proof.visibility !== "private" && <CopyLinkButton url={publicUrl} />}
        </div>
      </div>

      {proof.status === "REVOKED" && (
        <div className="mt-6 rounded-2xl border border-zinc-500/30 bg-zinc-500/10 px-5 py-4">
          <p className="text-sm font-semibold text-zinc-300">This proof was revoked {proof.revoked_at ? `on ${new Date(proof.revoked_at).toLocaleString()}` : ""}.</p>
          <p className="mt-1 text-xs text-zinc-500">The record is preserved for transparency but can no longer be edited or verified.</p>
        </div>
      )}
      {proof.status === "DISPUTED" && (
        <div className="mt-6 rounded-2xl border border-orange-400/30 bg-orange-500/10 px-5 py-4">
          <p className="text-sm font-semibold text-orange-300">This proof is disputed.</p>
          <p className="mt-1 text-xs text-orange-200/70">Resolve every open report below to restore it. It stays visible — disputes are never hidden silently.</p>
        </div>
      )}

      {/* CLAIM vs EVIDENCE vs CHECK vs VERIFICATION */}
      <div className="mt-8 grid gap-4 md:grid-cols-2">
        <GlassCard className="p-6">
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">Claim — what you said</p>
          <p className="mt-2 font-display text-lg font-semibold leading-snug text-white">“{proof.claim}”</p>
          {proof.description && <p className="mt-3 text-sm leading-relaxed text-slate-400">{proof.description}</p>}
          {proof.contribution && (
            <div className="mt-4">
              <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">Your contribution</p>
              <p className="mt-1 text-sm text-slate-300">{proof.contribution}</p>
            </div>
          )}
          <div className="mt-4 flex flex-wrap gap-x-6 gap-y-1 text-xs text-slate-500">
            {proof.start_date && <span>Started: {proof.start_date}</span>}
            {proof.completion_date && <span>Completed: {proof.completion_date}</span>}
          </div>
        </GlassCard>
        <GlassCard className="p-6">
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">Verification — what was confirmed</p>
          <div className="mt-3">
            <CoverageRing value={proof.coverage} />
          </div>
          {latestCheckAt && <p className="mt-3 text-xs text-slate-500">Last run: {latestCheckAt}</p>}
          <div className="mt-4">
            <AiAssist mode="analyze_evidence" getInput={() => ({ claim: proof.claim, evidence: evidence ?? [] })} />
            <AiAssist mode="flag_inconsistencies" getInput={() => ({ claim: proof.claim, description: proof.description, evidence: evidence ?? [] })} />
          </div>
        </GlassCard>
      </div>

      {/* EVIDENCE */}
      <div className="mt-8">
        <SectionTitle hint="Every item stores its type, source, description and timestamp.">
          Evidence ({(evidence ?? []).length})
        </SectionTitle>
        <GlassCard className="p-6">
          {proof.status === "REVOKED" ? (
            <p className="text-sm text-slate-500">Frozen — revoked proofs cannot change their evidence.</p>
          ) : (
            <EvidenceManager proofUuid={id} initial={(evidence ?? []) as never} />
          )}
        </GlassCard>
      </div>

      {/* CHECKS */}
      <div className="mt-8">
        <SectionTitle hint="Each row is a real technical check Proofly performed — nothing is faked.">
          Verification checks
        </SectionTitle>
        <GlassCard className="divide-y divide-white/5">
          {(checks ?? []).length === 0 && <p className="p-6 text-sm text-slate-500">No checks yet — run verification to inspect this proof&apos;s evidence for real.</p>}
          {(checks ?? []).map((c) => (
            <div key={c.id} className="flex items-start gap-3 px-5 py-4">
              <span className="mt-0.5">
                {c.status === "passed" ? <CheckIcon ok /> : c.status === "failed" ? <CheckIcon ok={false} /> : <span className="text-slate-500">?</span>}
              </span>
              <div className="min-w-0">
                <p className="text-sm font-medium text-white">
                  {c.check_type.replace(/_/g, " ")}
                  <span className={`ml-2 rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${c.status === "passed" ? "bg-emerald-500/15 text-emerald-300" : c.status === "failed" ? "bg-rose-500/15 text-rose-300" : "bg-slate-500/15 text-slate-400"}`}>
                    {c.status === "unverifiable" ? "could not verify" : c.status}
                  </span>
                </p>
                {c.target && <p className="truncate font-mono text-xs text-slate-500">{c.target}</p>}
                <p className="mt-0.5 text-xs text-slate-400">{c.detail}</p>
              </div>
            </div>
          ))}
        </GlassCard>
      </div>

      {/* HUMAN VERIFICATION */}
      <div className="mt-8">
        <SectionTitle hint="Ask someone who saw the work to confirm it. Their verdict is recorded with their identity.">
          Human verification
        </SectionTitle>
        <div className="grid gap-4 lg:grid-cols-2">
          <GlassCard className="p-6">
            <p className="mb-4 font-display text-sm font-semibold text-white">Request verification</p>
            {proof.status === "REVOKED" ? <p className="text-sm text-slate-500">Unavailable for revoked proofs.</p> : <RequestVerifierForm proofUuid={id} />}
          </GlassCard>
          <GlassCard className="p-6">
            <p className="mb-4 font-display text-sm font-semibold text-white">Requests ({(vreqs ?? []).length})</p>
            {(vreqs ?? []).length === 0 && <p className="text-sm text-slate-500">No requests yet.</p>}
            <div className="space-y-3">
              {(vreqs ?? []).map((r) => (
                <div key={r.id} className="rounded-xl border border-white/10 p-4">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium text-white">→ {r.verifier_id ? verifierNames[r.verifier_id] ?? "verifier" : r.verifier_email}</p>
                    <span className="rounded-full bg-white/5 px-2.5 py-0.5 text-[11px] uppercase tracking-wider text-slate-400">{r.status.replace("_", " ")}</span>
                  </div>
                  {r.message && <p className="mt-1 text-xs text-slate-500">“{r.message}”</p>}
                  {(reviews[r.id] ?? []).map((rev, i) => (
                    <div key={i} className="mt-2 rounded-lg bg-white/[0.04] p-3">
                      <p className="text-xs font-semibold text-white capitalize">{rev.action.replace("_", " ")}</p>
                      {rev.comment && <p className="mt-0.5 text-xs text-slate-400">“{rev.comment}”</p>}
                      <p className="mt-1 text-[11px] text-slate-600">{new Date(rev.created_at).toLocaleString()}</p>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </GlassCard>
        </div>
      </div>

      {/* DISPUTES */}
      {(openDisputes.length > 0 || (disputes ?? []).length > 0) && (
        <div className="mt-8">
          <SectionTitle hint="Public reports on this proof. Resolve each one — dismissed or fixed.">Disputes ({openDisputes.length} open)</SectionTitle>
          <div className="space-y-3">
            {(disputes ?? []).map((d) => (
              <GlassCard key={d.id} className="flex flex-wrap items-center justify-between gap-3 p-5">
                <div>
                  <p className="text-sm font-semibold text-white">{d.reason.replace(/_/g, " ")}
                    <span className={`ml-2 rounded px-1.5 py-0.5 text-[10px] uppercase tracking-wider ${d.status === "open" ? "bg-orange-500/15 text-orange-300" : "bg-white/5 text-slate-400"}`}>{d.status}</span>
                  </p>
                  {d.detail && <p className="mt-1 text-xs text-slate-400">{d.detail}</p>}
                  <p className="mt-1 text-[11px] text-slate-600">{new Date(d.created_at).toLocaleString()}</p>
                </div>
                {d.status === "open" && proof.status !== "REVOKED" && <ResolveDisputeButtons proofUuid={id} disputeId={d.id} />}
              </GlassCard>
            ))}
          </div>
        </div>
      )}

      {/* SNAPSHOT */}
      {proof.status === "VERIFIED" && (
        <div className="mt-8">
          <SectionTitle hint="Shareable card for LinkedIn, X, portfolios and CVs.">Proof snapshot</SectionTitle>
          <SnapshotCard
            proofId={proof.proof_id}
            title={proof.title}
            creator={creator}
            verifiedAt={latestCheckAt ?? new Date(proof.updated_at).toLocaleDateString()}
            evidenceCount={(evidence ?? []).length}
            qrDataUrl={await qrDataUrl(publicUrl)}
            publicUrl={publicUrl}
          />
        </div>
      )}

      {/* TIMELINE */}
      <div className="mt-8">
        <SectionTitle>Timeline</SectionTitle>
        <GlassCard className="p-6">
          {(events ?? []).length === 0 && <p className="text-sm text-slate-500">No events yet.</p>}
          <ol className="relative space-y-4 border-l border-white/10 pl-5">
            {(events ?? []).map((e) => (
              <li key={e.id} className="relative">
                <span className="absolute -left-[26px] top-1 h-2.5 w-2.5 rounded-full bg-cyan-400/70" />
                <p className="text-sm font-medium capitalize text-white">{e.event_type.replace(/_/g, " ")}</p>
                <p className="text-[11px] text-slate-500">{new Date(e.created_at).toLocaleString()}</p>
              </li>
            ))}
          </ol>
        </GlassCard>
      </div>

      {/* DANGER */}
      {proof.status !== "REVOKED" && (
        <div className="mt-8">
          <SectionTitle>Danger zone</SectionTitle>
          <GlassCard className="flex flex-wrap items-center gap-3 border-rose-500/20 p-6">
            <RevokeButton proofUuid={id} />
            {proof.status !== "VERIFIED" && <DeleteProofButton proofUuid={id} />}
            <p className="w-full text-xs text-slate-500">Revoking preserves the record and marks it REVOKED. Deleting is permanent and only allowed before verification.</p>
          </GlassCard>
        </div>
      )}

      {proof.visibility !== "private" && (
        <div className="mt-8">
          <DisputeForm proofUuid={id} />
        </div>
      )}
    </div>
  );
}
